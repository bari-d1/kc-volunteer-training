import "server-only";
import { z } from "zod";
import { Prisma, type BlockType } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import {
  BLOCK_INFO,
  BLOCK_TYPES,
  validateBlockContent,
} from "@/lib/block-editor";
import { prisma } from "@/lib/prisma";
import {
  blockContentSchemas,
  toVolunteerBlock,
  type VolunteerBlock,
} from "@/lib/schemas/blocks";
import { resolveBlockSources } from "../block-sources";
import { logChange } from "./change-log";
import { BlockEditError } from "./inputs";

type Tx = Prisma.TransactionClient;

const blockSelect = {
  id: true,
  type: true,
  order: true,
  content: true,
  isPublished: true,
  draftContent: true,
  draftDeleted: true,
  draftOrder: true,
} as const;

type BlockRow = Prisma.BlockGetPayload<{ select: typeof blockSelect }>;

/** Where a block sits in the editor: its draft position if it has one. */
const position = (b: { order: number; draftOrder: number | null }) =>
  b.draftOrder ?? b.order;

/** True when the block has anything volunteers can't see yet. */
function hasUnpublishedChange(b: BlockRow) {
  return (
    !b.isPublished ||
    b.draftDeleted ||
    b.draftContent !== null ||
    (b.draftOrder !== null && b.draftOrder !== b.order)
  );
}

async function moduleBySlugs(courseSlug: string, moduleSlug: string) {
  return prisma.module.findFirst({
    where: { slug: moduleSlug, course: { slug: courseSlug } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      narratorIntro: true,
      isPublished: true,
      course: { select: { id: true, slug: true, title: true } },
    },
  });
}

async function draftBlocks(db: Tx | typeof prisma, moduleId: string) {
  const blocks = await db.block.findMany({
    where: { moduleId },
    select: blockSelect,
  });
  return blocks.sort((a, b) => position(a) - position(b) || a.order - b.order);
}

/**
 * A module as the editor sees it: draft content where there is some, blocks
 * in draft order, and whether anything is unpublished.
 */
export async function getModuleEditor(courseSlug: string, moduleSlug: string) {
  await requireAdmin();
  const courseModule = await moduleBySlugs(courseSlug, moduleSlug);
  if (!courseModule) return null;
  const blocks = await draftBlocks(prisma, courseModule.id);
  return {
    module: courseModule,
    blocks: blocks
      .filter((b) => !b.draftDeleted)
      .map((b) => ({
        id: b.id,
        type: b.type,
        content: (b.draftContent ?? b.content) as unknown,
        isNew: !b.isPublished,
        changed: b.isPublished && b.draftContent !== null,
      })),
    deletedCount: blocks.filter((b) => b.draftDeleted && b.isPublished).length,
    hasUnpublishedChanges: blocks.some(hasUnpublishedChange),
  };
}

export type ModuleEditor = NonNullable<
  Awaited<ReturnType<typeof getModuleEditor>>
>;

/** Writes draftOrder 0…n for the given blocks, in that order. */
async function writeDraftOrder(tx: Tx, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.block.update({ where: { id }, data: { draftOrder: index } });
  }
}

/** Adds an unpublished block of the given type at the end of the module. */
export async function createBlock(moduleId: string, type: unknown) {
  await requireAdmin();
  const blockType = z
    .enum(BLOCK_TYPES as [BlockType, ...BlockType[]])
    .parse(type);
  return prisma.$transaction(async (tx) => {
    const blocks = await draftBlocks(tx, moduleId);
    const last = Math.max(
      -1,
      ...blocks.map((b) => Math.max(b.order, position(b))),
    );
    const starter = BLOCK_INFO[blockType].starter as Prisma.InputJsonValue;
    const block = await tx.block.create({
      data: {
        moduleId,
        type: blockType,
        order: last + 1,
        content: starter,
        draftContent: starter,
        isPublished: false,
      },
      select: { id: true },
    });
    await logChange(
      tx,
      "Block",
      block.id,
      "create",
      `Added a ${BLOCK_INFO[blockType].label.toLowerCase()} block (draft)`,
    );
    return block.id;
  });
}

/**
 * Saves a block's draft. Content is checked against the block type's Zod
 * schema first: invalid content is never written.
 */
export async function saveBlockDraft(blockId: string, content: unknown) {
  await requireAdmin();
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: { type: true, draftDeleted: true },
  });
  if (!block || block.draftDeleted) throw new BlockEditError("Block not found");
  const check = validateBlockContent(block.type, content);
  if (!check.valid) {
    throw new BlockEditError("Some fields need fixing.", check.errors);
  }
  // Store the schema's output (trimmed strings, unknown keys dropped).
  const parsed = blockContentSchemas[block.type].parse(content);
  await prisma.block.update({
    where: { id: blockId },
    data: { draftContent: parsed as Prisma.InputJsonValue },
  });
}

/** Sets the draft order of a module's blocks to the order of ids. */
export async function reorderBlocks(moduleId: string, ids: unknown) {
  await requireAdmin();
  const list = z.array(z.uuid()).min(1).parse(ids);
  await prisma.$transaction(async (tx) => {
    const count = await tx.block.count({
      where: { moduleId, id: { in: list }, draftDeleted: false },
    });
    if (count !== list.length) {
      throw new BlockEditError("Every block must belong to this module");
    }
    await writeDraftOrder(tx, list);
  });
}

/** Copies a block (with its draft content) to just after itself, unpublished. */
export async function duplicateBlock(blockId: string) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const source = await tx.block.findUnique({
      where: { id: blockId },
      select: { moduleId: true, ...blockSelect },
    });
    if (!source) throw new BlockEditError("Block not found");
    const blocks = (await draftBlocks(tx, source.moduleId)).filter(
      (b) => !b.draftDeleted,
    );
    const content = (source.draftContent ??
      source.content) as Prisma.InputJsonValue;
    const copy = await tx.block.create({
      data: {
        moduleId: source.moduleId,
        type: source.type,
        order: Math.max(...blocks.map((b) => b.order)) + 1,
        content,
        draftContent: content,
        isPublished: false,
      },
      select: { id: true },
    });
    const ids = blocks.map((b) => b.id);
    ids.splice(ids.indexOf(blockId) + 1, 0, copy.id);
    await writeDraftOrder(tx, ids);
    await logChange(
      tx,
      "Block",
      copy.id,
      "create",
      `Duplicated a ${BLOCK_INFO[source.type].label.toLowerCase()} block (draft)`,
    );
    return copy.id;
  });
}

/**
 * Removes a block from the draft. A block volunteers have never seen is
 * deleted outright; a published one is marked and deleted on publish.
 */
export async function deleteBlock(blockId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const block = await tx.block.findUnique({
      where: { id: blockId },
      select: { isPublished: true, type: true },
    });
    if (!block) return;
    if (block.isPublished) {
      await tx.block.update({
        where: { id: blockId },
        data: { draftDeleted: true },
      });
    } else {
      await tx.block.delete({ where: { id: blockId } });
    }
    await logChange(
      tx,
      "Block",
      blockId,
      "delete",
      `Removed a ${BLOCK_INFO[block.type].label.toLowerCase()} block (draft)`,
    );
  });
}

/**
 * Makes the draft live: draft content and order replace the published
 * ones, new blocks are published, removed blocks are deleted, and the
 * drafts are cleared. One ContentChange row for the lot.
 */
export async function publishModuleChanges(moduleId: string) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const courseModule = await tx.module.findUniqueOrThrow({
      where: { id: moduleId },
      select: { title: true },
    });
    const blocks = await draftBlocks(tx, moduleId);
    const changed = blocks.filter(hasUnpublishedChange).length;
    for (const block of blocks.filter((b) => b.draftDeleted)) {
      await tx.block.delete({ where: { id: block.id } });
    }
    for (const [order, block] of blocks
      .filter((b) => !b.draftDeleted)
      .entries()) {
      // Every draft was validated when it was saved; check again anyway.
      const content = block.draftContent ?? block.content;
      if (!validateBlockContent(block.type, content).valid) {
        throw new BlockEditError(
          "A block has invalid content. Fix it, then publish.",
        );
      }
      await tx.block.update({
        where: { id: block.id },
        data: {
          content: content as Prisma.InputJsonValue,
          order,
          isPublished: true,
          draftContent: Prisma.DbNull,
          draftOrder: null,
        },
      });
    }
    await logChange(
      tx,
      "Module",
      moduleId,
      "publish",
      `Published changes to “${courseModule.title}” (${changed} block${changed === 1 ? "" : "s"})`,
    );
    return changed;
  });
}

/** Throws the draft away: back to exactly what volunteers see. */
export async function discardModuleChanges(moduleId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const courseModule = await tx.module.findUniqueOrThrow({
      where: { id: moduleId },
      select: { title: true },
    });
    await tx.block.deleteMany({ where: { moduleId, isPublished: false } });
    await tx.block.updateMany({
      where: { moduleId },
      data: {
        draftContent: Prisma.DbNull,
        draftDeleted: false,
        draftOrder: null,
      },
    });
    await logChange(
      tx,
      "Module",
      moduleId,
      "update",
      `Discarded unpublished changes to “${courseModule.title}”`,
    );
  });
}

/**
 * The module as volunteers would see it once published, for the admin
 * preview: draft content, draft order, removed blocks left out.
 */
export async function getModulePreview(courseSlug: string, moduleSlug: string) {
  await requireAdmin();
  const courseModule = await moduleBySlugs(courseSlug, moduleSlug);
  if (!courseModule) return null;
  const blocks = (await draftBlocks(prisma, courseModule.id)).filter(
    (b) => !b.draftDeleted,
  );
  const preview: VolunteerBlock[] = [];
  for (const [order, b] of blocks.entries()) {
    try {
      preview.push(
        toVolunteerBlock({
          id: b.id,
          type: b.type,
          content: b.draftContent ?? b.content,
          order,
        } as Parameters<typeof toVolunteerBlock>[0]),
      );
    } catch {
      // Invalid content can't be saved, but skip it rather than break the page.
    }
  }
  return { module: courseModule, blocks: await resolveBlockSources(preview) };
}

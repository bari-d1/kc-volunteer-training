import "server-only";
import { z } from "zod";
import type { BlockType } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { blockContentSchemas, BlockSchema } from "@/lib/schemas/blocks";
import { logChange } from "./change-log";
import { IdListSchema } from "./inputs";

const CreateBlockSchema = z.object({
  moduleId: z.uuid(),
  isPublished: z.boolean().default(true),
});

/** Adds a block at the end of the module. Content is validated for its type. */
export async function createBlock(input: unknown) {
  await requireAdmin();
  const { moduleId, isPublished } = CreateBlockSchema.parse(input);
  const { type, content } = BlockSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const last = await tx.block.findFirst({
      where: { moduleId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const block = await tx.block.create({
      data: {
        moduleId,
        type,
        content,
        isPublished,
        order: (last?.order ?? -1) + 1,
      },
    });
    await logChange(tx, "Block", block.id, "create", `Added ${type} block`);
    return block;
  });
}

const UpdateBlockSchema = z.object({
  content: z.unknown().optional(),
  isPublished: z.boolean().optional(),
});

/** Updates content (validated against the block's existing type) or visibility. */
export async function updateBlock(id: string, input: unknown) {
  await requireAdmin();
  const { content, isPublished } = UpdateBlockSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.block.findUniqueOrThrow({
      where: { id },
      select: { type: true },
    });
    const schema = blockContentSchemas[existing.type as BlockType];
    const data = {
      ...(content !== undefined && { content: schema.parse(content) }),
      ...(isPublished !== undefined && { isPublished }),
    };
    const block = await tx.block.update({ where: { id }, data });
    const action =
      isPublished === undefined
        ? "update"
        : isPublished
          ? "publish"
          : "unpublish";
    await logChange(
      tx,
      "Block",
      id,
      action,
      `${action} ${existing.type} block`,
    );
    return block;
  });
}

export async function reorderBlocks(moduleId: string, blockIds: unknown) {
  await requireAdmin();
  const ids = IdListSchema.parse(blockIds);
  await prisma.$transaction(async (tx) => {
    const count = await tx.block.count({
      where: { moduleId, id: { in: ids } },
    });
    if (count !== ids.length)
      throw new Error("Every block must belong to this module");
    for (const [order, id] of ids.entries()) {
      await tx.block.update({ where: { id }, data: { order } });
    }
    await logChange(tx, "Module", moduleId, "reorder", "Reordered blocks");
  });
}

export async function deleteBlock(id: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const block = await tx.block.delete({ where: { id } });
    await logChange(tx, "Block", id, "delete", `Deleted ${block.type} block`);
  });
}

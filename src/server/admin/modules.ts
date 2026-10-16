import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { logChange } from "./change-log";
import { IdListSchema, ModuleInputSchema } from "./inputs";

/**
 * A course's modules in order, with how many blocks each has, how many of
 * those are unpublished drafts, and how many volunteers have progress.
 */
export async function listModules(courseId: string) {
  await requireAdmin();
  const [modules, drafts] = await Promise.all([
    prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: { _count: { select: { blocks: true, progress: true } } },
    }),
    prisma.block.groupBy({
      by: ["moduleId"],
      where: { isPublished: false, module: { courseId } },
      _count: { _all: true },
    }),
  ]);
  const draftCounts = new Map(drafts.map((d) => [d.moduleId, d._count._all]));
  return modules.map(({ _count, ...m }) => ({
    ...m,
    blockCount: _count.blocks,
    draftBlockCount: draftCounts.get(m.id) ?? 0,
    progressCount: _count.progress,
  }));
}

export async function getModuleWithBlocks(id: string) {
  await requireAdmin();
  return prisma.module.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
}

/** Adds a module at the end of the course. */
export async function createModule(courseId: string, input: unknown) {
  await requireAdmin();
  const data = ModuleInputSchema.parse(input);
  const id = z.uuid().parse(courseId);
  return prisma.$transaction(async (tx) => {
    const last = await tx.module.findFirst({
      where: { courseId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const courseModule = await tx.module.create({
      data: { ...data, courseId: id, order: (last?.order ?? -1) + 1 },
    });
    await logChange(
      tx,
      "Module",
      courseModule.id,
      "create",
      `Created module “${courseModule.title}”`,
    );
    return courseModule;
  });
}

export async function updateModule(id: string, input: unknown) {
  await requireAdmin();
  const data = ModuleInputSchema.partial().parse(input);
  return prisma.$transaction(async (tx) => {
    const courseModule = await tx.module.update({ where: { id }, data });
    await logChange(
      tx,
      "Module",
      id,
      "update",
      `Updated module “${courseModule.title}”`,
    );
    return courseModule;
  });
}

/** Publishes or unpublishes a module; volunteers see it change straight away. */
export async function setModulePublished(id: string, isPublished: boolean) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const courseModule = await tx.module.update({
      where: { id },
      data: { isPublished },
    });
    await logChange(
      tx,
      "Module",
      id,
      isPublished ? "publish" : "unpublish",
      `${isPublished ? "Published" : "Unpublished"} module “${courseModule.title}”`,
    );
    return courseModule;
  });
}

/** Sets module order to the position of each id in the list. */
export async function reorderModules(courseId: string, moduleIds: unknown) {
  await requireAdmin();
  const ids = IdListSchema.parse(moduleIds);
  await prisma.$transaction(async (tx) => {
    const count = await tx.module.count({
      where: { courseId, id: { in: ids } },
    });
    if (count !== ids.length)
      throw new Error("Every module must belong to this course");
    for (const [order, id] of ids.entries()) {
      await tx.module.update({ where: { id }, data: { order } });
    }
    await logChange(tx, "Course", courseId, "reorder", "Reordered modules");
  });
}

/**
 * Deletes a module and its blocks, but only if no volunteer has progress on
 * it: deleting would wipe their progress, so those can only be unpublished.
 */
export async function deleteModule(id: string) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const progress = await tx.moduleProgress.count({ where: { moduleId: id } });
    if (progress > 0) {
      return {
        deleted: false as const,
        reason: `${progress} volunteer${progress === 1 ? " has" : "s have"} progress on this module. Unpublish it instead.`,
      };
    }
    const courseModule = await tx.module.delete({ where: { id } });
    await logChange(
      tx,
      "Module",
      id,
      "delete",
      `Deleted module “${courseModule.title}”`,
    );
    return { deleted: true as const };
  });
}

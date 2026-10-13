import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { logChange } from "./change-log";
import { IdListSchema, ModuleInputSchema } from "./inputs";

export async function listModules(courseId: string) {
  await requireAdmin();
  return prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { _count: { select: { blocks: true } } },
  });
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

export async function deleteModule(id: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const courseModule = await tx.module.delete({ where: { id } });
    await logChange(
      tx,
      "Module",
      id,
      "delete",
      `Deleted module “${courseModule.title}”`,
    );
  });
}

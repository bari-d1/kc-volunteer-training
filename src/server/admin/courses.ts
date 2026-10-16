import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { logChange } from "./change-log";
import { CourseInputSchema } from "./inputs";

export async function listCourses() {
  await requireAdmin();
  return prisma.course.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: { _count: { select: { modules: true, certificates: true } } },
  });
}

export async function getCourse(id: string) {
  await requireAdmin();
  return prisma.course.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
}

export async function getCourseBySlug(slug: string) {
  await requireAdmin();
  return prisma.course.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, isPublished: true },
  });
}

export async function createCourse(input: unknown) {
  await requireAdmin();
  const data = CourseInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({ data });
    await logChange(
      tx,
      "Course",
      course.id,
      "create",
      `Created course “${course.title}”`,
    );
    return course;
  });
}

export async function updateCourse(id: string, input: unknown) {
  await requireAdmin();
  const data = CourseInputSchema.partial().parse(input);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.update({ where: { id }, data });
    await logChange(
      tx,
      "Course",
      id,
      "update",
      `Updated course “${course.title}”`,
    );
    return course;
  });
}

/** Courses with issued certificates can't be deleted (FK restrict). */
export async function deleteCourse(id: string) {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.delete({ where: { id } });
      await logChange(
        tx,
        "Course",
        id,
        "delete",
        `Deleted course “${course.title}”`,
      );
    });
    return { deleted: true as const };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        deleted: false as const,
        reason: "This course has issued certificates. Unpublish it instead.",
      };
    }
    throw error;
  }
}

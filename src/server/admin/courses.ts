import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
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

/**
 * Deletes a course with its modules, blocks, quiz and volunteers' progress
 * in it. The main course (the site's training) and courses with issued
 * certificates (FK restrict) can't be deleted.
 */
export async function deleteCourse(id: string) {
  await requireAdmin();
  const course = await prisma.course.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!course) return { deleted: true as const };
  if (course.slug === DEFAULT_COURSE_SLUG) {
    return {
      deleted: false as const,
      reason:
        "This is the main course volunteers take, so it can't be deleted. Unpublish modules instead.",
    };
  }
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

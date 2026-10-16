"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import { createCourse } from "@/server/admin/courses";
import { isUniqueViolation } from "@/server/admin/inputs";
import {
  createModule,
  deleteModule,
  reorderModules,
  setModulePublished,
  updateModule,
} from "@/server/admin/modules";

const Id = z.uuid();

/** Turns validation and duplicate-slug errors into an ActionResult. */
async function attempt<T>(
  task: () => Promise<T>,
  duplicateSlug: string,
): Promise<ActionResult<T>> {
  try {
    const data = await task();
    revalidatePath("/admin/content", "layout");
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (error instanceof z.ZodError) return invalid(error);
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: duplicateSlug,
        fieldErrors: { slug: duplicateSlug },
      };
    }
    console.error("Content change failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function createCourseAction(input: unknown) {
  await requireAdmin();
  return attempt(
    async () => (await createCourse(input)).id,
    "Another course already uses this slug.",
  );
}

export async function createModuleAction(courseId: string, input: unknown) {
  await requireAdmin();
  return attempt(
    async () => (await createModule(Id.parse(courseId), input)).id,
    "Another module in this course already uses this slug.",
  );
}

export async function updateModuleAction(id: string, input: unknown) {
  await requireAdmin();
  return attempt(
    async () => (await updateModule(Id.parse(id), input)).id,
    "Another module in this course already uses this slug.",
  );
}

export async function setModulePublishedAction(id: string, published: boolean) {
  await requireAdmin();
  return attempt(
    async () => (await setModulePublished(Id.parse(id), published === true)).id,
    "",
  );
}

export async function reorderModulesAction(courseId: string, ids: string[]) {
  await requireAdmin();
  return attempt(() => reorderModules(Id.parse(courseId), ids), "");
}

export async function deleteModuleAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await attempt(() => deleteModule(Id.parse(id)), "");
  if (!result.ok) return result;
  return result.data.deleted
    ? { ok: true }
    : { ok: false, error: result.data.reason };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/form-errors";
import {
  deleteVolunteer,
  resetModuleProgress,
  resetQuizAttempts,
} from "@/server/admin/volunteers";

const Id = z.uuid();

async function run(
  id: string,
  task: (id: string) => Promise<unknown>,
  failure: string,
): Promise<ActionResult> {
  const parsed = Id.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Volunteer not found." };
  try {
    await task(parsed.data);
    revalidatePath("/admin/volunteers");
    return { ok: true };
  } catch (error) {
    console.error(failure, error);
    return { ok: false, error: `${failure}. Please try again.` };
  }
}

export async function resetQuizAttemptsAction(id: string) {
  await requireAdmin();
  return run(id, resetQuizAttempts, "Couldn't reset the quiz attempts");
}

export async function resetModuleProgressAction(id: string) {
  await requireAdmin();
  return run(id, resetModuleProgress, "Couldn't reset the module progress");
}

export async function deleteVolunteerAction(id: string) {
  await requireAdmin();
  return run(id, deleteVolunteer, "Couldn't delete the volunteer");
}

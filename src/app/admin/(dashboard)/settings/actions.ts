"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import { SettingsError } from "@/server/admin/inputs";
import {
  saveEmailSettings,
  saveQuizSettings,
  saveSafeguardingSettings,
  saveWhatsappLink,
  signOutAllAdminSessions,
} from "@/server/admin/settings";

async function attempt(task: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await task();
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) return invalid(error);
    if (error instanceof SettingsError) {
      return {
        ok: false,
        error: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    console.error("Saving settings failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function saveSafeguardingAction(input: unknown) {
  await requireAdmin();
  return attempt(() => saveSafeguardingSettings(input));
}

export async function saveWhatsappAction(input: unknown) {
  await requireAdmin();
  return attempt(() => saveWhatsappLink(input));
}

export async function saveQuizAction(input: unknown) {
  await requireAdmin();
  return attempt(() => saveQuizSettings(input));
}

export async function saveEmailsAction(input: unknown) {
  await requireAdmin();
  return attempt(() => saveEmailSettings(input));
}

/** Signs every admin out, including this one, then back to the login. */
export async function signOutAllAdminSessionsAction() {
  await requireAdmin();
  await signOutAllAdminSessions();
  redirect("/admin/login");
}

"use server";

import { z } from "zod";
import { requireVolunteer } from "@/lib/auth";
import { setNarratorHidden } from "@/server/account";

/** Saves the signed-in volunteer's "Hide guide" choice. */
export async function setGuideHidden(hidden: boolean) {
  const profile = await requireVolunteer();
  const parsed = z.boolean().safeParse(hidden);
  if (!parsed.success) return { ok: false as const };
  try {
    await setNarratorHidden(profile.id, parsed.data);
    return { ok: true as const };
  } catch (error) {
    console.error("Saving hideNarrator failed", error);
    return { ok: false as const };
  }
}

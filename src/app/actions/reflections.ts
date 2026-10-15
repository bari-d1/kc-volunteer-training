"use server";

import { z } from "zod";
import { requireVolunteer } from "@/lib/auth";
import { ProgressError } from "@/server/progress";
import { MAX_REFLECTION_LENGTH, saveReflection } from "@/server/reflections";

const SaveInput = z.object({
  blockId: z.uuid(),
  answer: z.string().max(MAX_REFLECTION_LENGTH),
});

/** Saves the signed-in volunteer's reflection answer. */
export async function saveReflectionAction(input: {
  blockId: string;
  answer: string;
}) {
  const profile = await requireVolunteer();
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };
  try {
    await saveReflection(profile.id, parsed.data.blockId, parsed.data.answer);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ProgressError)
      return { ok: false as const, error: error.code };
    throw error;
  }
}

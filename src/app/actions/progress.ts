"use server";

import { z } from "zod";
import { requireVolunteer } from "@/lib/auth";
import { completeModule, ProgressError, saveProgress } from "@/server/progress";

const SaveInput = z.object({
  moduleId: z.uuid(),
  lastBlockOrder: z.number().int().min(0),
});

/** Records the furthest block reached. Best effort: failures are reported, not thrown. */
export async function saveProgressAction(input: {
  moduleId: string;
  lastBlockOrder: number;
}) {
  const profile = await requireVolunteer();
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };
  try {
    await saveProgress(
      profile.id,
      parsed.data.moduleId,
      parsed.data.lastBlockOrder,
    );
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ProgressError)
      return { ok: false as const, error: error.code };
    throw error;
  }
}

const CompleteInput = z.object({ moduleId: z.uuid() });

/** Completes the module for the signed-in volunteer, unlocking the next one. */
export async function completeModuleAction(input: { moduleId: string }) {
  const profile = await requireVolunteer();
  const parsed = CompleteInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };
  try {
    await completeModule(profile.id, parsed.data.moduleId);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ProgressError)
      return { ok: false as const, error: error.code };
    throw error;
  }
}

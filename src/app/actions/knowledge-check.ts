"use server";

import { z } from "zod";
import { requireVolunteer } from "@/lib/auth";
import { checkAnswer, completeCheck } from "@/server/knowledge-check";

const CheckInputSchema = z.object({
  blockId: z.uuid(),
  questionIndex: z.number().int().min(0),
  optionId: z.string().min(1),
});

/** Checks one answer for the signed-in volunteer. */
export async function checkKnowledgeAnswer(input: {
  blockId: string;
  questionIndex: number;
  optionId: string;
}) {
  const profile = await requireVolunteer();
  const parsed = CheckInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: "not-found" as const };
  const { blockId, questionIndex, optionId } = parsed.data;
  return checkAnswer(profile.id, blockId, questionIndex, optionId);
}

const CompleteInputSchema = z.object({
  blockId: z.uuid(),
  answers: z
    .array(
      z.object({
        questionIndex: z.number().int().min(0),
        optionId: z.string().min(1),
      }),
    )
    .min(1),
});

/** Called once every question is correct; the server re-grades before passing. */
export async function completeKnowledgeCheck(input: {
  blockId: string;
  answers: Array<{ questionIndex: number; optionId: string }>;
}) {
  const profile = await requireVolunteer();
  const parsed = CompleteInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: "not-found" as const };
  return completeCheck(profile.id, parsed.data.blockId, parsed.data.answers);
}

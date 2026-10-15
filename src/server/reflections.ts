import "server-only";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReflectionContentSchema } from "@/lib/schemas/blocks";
import { assertUnlocked, ProgressError } from "./progress";

/** Long enough for a thoughtful answer, short enough to bound storage. */
export const MAX_REFLECTION_LENGTH = 2000;

/**
 * Saves (or, when blank, clears) the volunteer's answer to a published
 * REFLECTION block in a module they've unlocked.
 */
export async function saveReflection(
  profileId: VolunteerId,
  blockId: string,
  answer: string,
) {
  const text = answer.trim();
  if (text.length > MAX_REFLECTION_LENGTH) {
    throw new ProgressError("invalid", "That answer is too long");
  }
  const block = await prisma.block.findFirst({
    where: { id: blockId, type: "REFLECTION", isPublished: true },
    select: { moduleId: true, content: true },
  });
  if (!block) throw new ProgressError("not-found", "Question not found");
  await assertUnlocked(profileId, block.moduleId);

  const key = { profileId_blockId: { profileId, blockId } };
  if (!text) {
    await prisma.reflectionAnswer.deleteMany({ where: { profileId, blockId } });
    return { saved: false as const };
  }
  const { prompt } = ReflectionContentSchema.parse(block.content);
  await prisma.reflectionAnswer.upsert({
    where: key,
    create: {
      profileId,
      blockId,
      moduleId: block.moduleId,
      prompt,
      answer: text,
    },
    update: { answer: text, prompt },
  });
  return { saved: true as const };
}

/** The volunteer's saved answers in a module, by block id. */
export async function getReflectionAnswers(
  profileId: VolunteerId,
  moduleId: string,
): Promise<Record<string, string>> {
  const rows = await prisma.reflectionAnswer.findMany({
    where: { profileId, moduleId, blockId: { not: null } },
    select: { blockId: true, answer: true },
  });
  return Object.fromEntries(rows.map((r) => [r.blockId!, r.answer]));
}

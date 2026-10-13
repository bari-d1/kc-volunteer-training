import "server-only";
import { z } from "zod";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeCheckContentSchema } from "@/lib/schemas/blocks";
import { computeModuleStates } from "./unlock";

export class ProgressError extends Error {
  constructor(
    readonly code: "not-found" | "locked" | "check-required" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "ProgressError";
  }
}

/**
 * Loads a published module and confirms it's unlocked for this volunteer.
 * Every write goes through this, so a crafted request can't touch a locked
 * or unpublished module.
 */
export async function assertUnlocked(profileId: VolunteerId, moduleId: string) {
  const courseModule = await prisma.module.findFirst({
    where: { id: moduleId, isPublished: true, course: { isPublished: true } },
    select: { id: true, courseId: true, requiresCheck: true },
  });
  if (!courseModule) throw new ProgressError("not-found", "Module not found");

  const [siblings, completed] = await Promise.all([
    prisma.module.findMany({
      where: { courseId: courseModule.courseId, isPublished: true },
      select: { id: true, order: true },
    }),
    prisma.moduleProgress.findMany({
      where: {
        profileId,
        completedAt: { not: null },
        module: { courseId: courseModule.courseId },
      },
      select: { moduleId: true },
    }),
  ]);
  const state = computeModuleStates(
    siblings,
    new Set(completed.map((c) => c.moduleId)),
  ).find((m) => m.id === moduleId);
  if (!state || state.status === "locked") {
    throw new ProgressError("locked", "Complete the previous module first");
  }
  return courseModule;
}

const where = (profileId: VolunteerId, moduleId: string) => ({
  profileId_moduleId: { profileId, moduleId },
});

/** Records how far through the module the volunteer is. Never moves backwards. */
export async function saveProgress(
  profileId: VolunteerId,
  moduleId: string,
  lastBlockOrder: number,
) {
  if (!Number.isInteger(lastBlockOrder) || lastBlockOrder < 0) {
    throw new ProgressError("invalid", "lastBlockOrder must be a whole number");
  }
  await assertUnlocked(profileId, moduleId);

  await prisma.moduleProgress.upsert({
    where: where(profileId, moduleId),
    create: { profileId, moduleId, lastBlockOrder },
    update: {},
  });
  await prisma.moduleProgress.updateMany({
    where: { profileId, moduleId, lastBlockOrder: { lt: lastBlockOrder } },
    data: { lastBlockOrder },
  });
}

export const KnowledgeCheckAnswersSchema = z.array(
  z.object({
    blockId: z.uuid(),
    questionIndex: z.number().int().min(0),
    optionId: z.string().min(1),
  }),
);
export type KnowledgeCheckAnswers = z.infer<typeof KnowledgeCheckAnswersSchema>;

/**
 * Grades the module's knowledge checks on the server and marks the check
 * passed only if every question is answered correctly. Returns per-question
 * results with explanations, so the answer key is only revealed after an
 * attempt.
 */
export async function markCheckPassed(
  profileId: VolunteerId,
  moduleId: string,
  answers: unknown,
) {
  const parsed = KnowledgeCheckAnswersSchema.safeParse(answers);
  if (!parsed.success) throw new ProgressError("invalid", "Invalid answers");
  await assertUnlocked(profileId, moduleId);

  const blocks = await prisma.block.findMany({
    where: { moduleId, isPublished: true, type: "KNOWLEDGE_CHECK" },
    orderBy: { order: "asc" },
    select: { id: true, content: true },
  });

  const chosen = new Map(
    parsed.data.map((a) => [`${a.blockId}:${a.questionIndex}`, a.optionId]),
  );
  const results = blocks.flatMap((block) => {
    const content = KnowledgeCheckContentSchema.parse(block.content);
    return content.questions.map((question, questionIndex) => {
      const optionId = chosen.get(`${block.id}:${questionIndex}`) ?? null;
      return {
        blockId: block.id,
        questionIndex,
        optionId,
        correct: optionId === question.correctOptionId,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
      };
    });
  });

  const passed = results.length > 0 && results.every((r) => r.correct);
  if (passed) {
    await prisma.moduleProgress.upsert({
      where: where(profileId, moduleId),
      create: { profileId, moduleId, checkPassed: true },
      update: { checkPassed: true },
    });
  }
  return { passed, results };
}

/**
 * Marks the module complete, which unlocks the next one. Requires a passed
 * knowledge check when the module has requiresCheck. Idempotent.
 */
export async function completeModule(profileId: VolunteerId, moduleId: string) {
  const courseModule = await assertUnlocked(profileId, moduleId);

  const progress = await prisma.moduleProgress.findUnique({
    where: where(profileId, moduleId),
    select: { checkPassed: true, completedAt: true },
  });
  if (progress?.completedAt) return { completedAt: progress.completedAt };
  if (courseModule.requiresCheck && !progress?.checkPassed) {
    throw new ProgressError("check-required", "Pass the knowledge check first");
  }

  const completedAt = new Date();
  await prisma.moduleProgress.upsert({
    where: where(profileId, moduleId),
    create: { profileId, moduleId, completedAt },
    update: { completedAt },
  });
  return { completedAt };
}

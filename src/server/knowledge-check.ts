import "server-only";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeCheckContentSchema } from "@/lib/schemas/blocks";
import { assertUnlocked, markCheckPassed, ProgressError } from "./progress";

/**
 * A published knowledge-check block in an unlocked module, with its answer
 * key. The module comes from the database, never from the client.
 */
async function loadCheck(profileId: VolunteerId, blockId: string) {
  const block = await prisma.block.findFirst({
    where: {
      id: blockId,
      type: "KNOWLEDGE_CHECK",
      isPublished: true,
      module: { isPublished: true, course: { isPublished: true } },
    },
    select: { id: true, moduleId: true, content: true },
  });
  if (!block) return null;

  await assertUnlocked(profileId, block.moduleId);
  const content = KnowledgeCheckContentSchema.safeParse(block.content);
  return content.success
    ? { ...block, questions: content.data.questions }
    : null;
}

export type CheckResult =
  | { ok: true; correct: boolean; explanation: string }
  | { ok: false; error: "not-found" | "locked" };

/** Grades one answer. Returns the explanation but never the correct option. */
export async function checkAnswer(
  profileId: VolunteerId,
  blockId: string,
  questionIndex: number,
  optionId: string,
): Promise<CheckResult> {
  try {
    const check = await loadCheck(profileId, blockId);
    const question = check?.questions[questionIndex];
    if (!question) return { ok: false, error: "not-found" };
    return {
      ok: true,
      correct: optionId === question.correctOptionId,
      explanation: question.explanation,
    };
  } catch (error) {
    if (error instanceof ProgressError && error.code === "locked") {
      return { ok: false, error: "locked" };
    }
    if (error instanceof ProgressError && error.code === "not-found") {
      return { ok: false, error: "not-found" };
    }
    throw error;
  }
}

/**
 * Re-grades every question in the block on the server and, if all are
 * correct, marks the module's check passed via markCheckPassed. A module
 * with several knowledge-check blocks only passes once all are submitted.
 */
export async function completeCheck(
  profileId: VolunteerId,
  blockId: string,
  answers: Array<{ questionIndex: number; optionId: string }>,
) {
  const check = await loadCheck(profileId, blockId);
  if (!check) return { ok: false as const, error: "not-found" as const };

  const blockPassed = check.questions.every((question, index) =>
    answers.some(
      (a) =>
        a.questionIndex === index && a.optionId === question.correctOptionId,
    ),
  );
  if (!blockPassed)
    return { ok: true as const, blockPassed, modulePassed: false };

  const { passed } = await markCheckPassed(
    profileId,
    check.moduleId,
    answers.map((a) => ({ blockId, ...a })),
  );
  return { ok: true as const, blockPassed, modulePassed: passed };
}

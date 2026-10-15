import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { checkAnswerKey, QuizOptionSchema } from "@/lib/schemas/quiz";
import { NonEmptyString } from "@/lib/schemas/common";
import { logChange } from "./change-log";

const QuizQuestionInputSchema = z
  .object({
    /** A QuizSection topic, e.g. "about-kc". */
    topic: NonEmptyString,
    group: NonEmptyString.nullable().default(null),
    prompt: NonEmptyString,
    options: z.array(QuizOptionSchema).min(2),
    correctOptionId: NonEmptyString,
    explanation: NonEmptyString,
    isRequired: z.boolean().default(false),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
  })
  .superRefine(checkAnswerKey);

/** Admin view, including answers. Never send this to volunteers. */
export async function listQuizQuestions(courseId: string) {
  await requireAdmin();
  return prisma.quizQuestion.findMany({
    where: { courseId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function createQuizQuestion(courseId: string, input: unknown) {
  await requireAdmin();
  const data = QuizQuestionInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const question = await tx.quizQuestion.create({
      data: { ...data, courseId: z.uuid().parse(courseId) },
    });
    await logChange(
      tx,
      "QuizQuestion",
      question.id,
      "create",
      "Added quiz question",
    );
    return question;
  });
}

export async function updateQuizQuestion(id: string, input: unknown) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.quizQuestion.findUniqueOrThrow({ where: { id } });
    // Validate the merged question so the answer key always matches the options.
    const merged = QuizQuestionInputSchema.parse({
      ...existing,
      ...(input as object),
    });
    const question = await tx.quizQuestion.update({
      where: { id },
      data: merged,
    });
    await logChange(tx, "QuizQuestion", id, "update", "Updated quiz question");
    return question;
  });
}

export async function deleteQuizQuestion(id: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.delete({ where: { id } });
    await logChange(tx, "QuizQuestion", id, "delete", "Deleted quiz question");
  });
}

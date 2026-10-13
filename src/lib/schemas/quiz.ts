import { z } from "zod";
import { NonEmptyString } from "./common";

export const QuizOptionSchema = z.object({
  id: NonEmptyString,
  text: NonEmptyString,
});
export type QuizOption = z.infer<typeof QuizOptionSchema>;

/** Options need unique ids, and the correct answer must be one of them. */
export function checkAnswerKey(
  value: { options: QuizOption[]; correctOptionId: string },
  ctx: z.RefinementCtx,
) {
  const ids = value.options.map((o) => o.id);
  ids.forEach((id, index) => {
    if (ids.indexOf(id) !== index) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate option id "${id}"`,
        path: ["options", index, "id"],
      });
    }
  });
  if (!ids.includes(value.correctOptionId)) {
    ctx.addIssue({
      code: "custom",
      message: "correctOptionId must match one of the option ids",
      path: ["correctOptionId"],
    });
  }
}

const QuizQuestionBase = z.object({
  id: z.uuid(),
  prompt: NonEmptyString,
  options: z.array(QuizOptionSchema).min(2),
  correctOptionId: NonEmptyString,
  explanation: NonEmptyString,
  /** Always included in every attempt. */
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

/** Admin side: includes the answer key. */
export const QuizQuestionSchema = QuizQuestionBase.superRefine(checkAnswerKey);
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

/**
 * Volunteer side. Unknown keys are stripped, so parsing an admin question
 * drops correctOptionId and explanation before it reaches the browser.
 */
export const PublicQuizQuestionSchema = QuizQuestionBase.pick({
  id: true,
  prompt: true,
  options: true,
});
export type PublicQuizQuestion = z.infer<typeof PublicQuizQuestionSchema>;

export const QuizSubmissionSchema = z
  .object({
    /** Opaque token issued with the attempt's questions. */
    attemptToken: NonEmptyString,
    answers: z
      .array(z.object({ questionId: z.uuid(), optionId: NonEmptyString }))
      .min(1),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.answers.forEach((answer, index) => {
      if (seen.has(answer.questionId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each question can only be answered once",
          path: ["answers", index, "questionId"],
        });
      }
      seen.add(answer.questionId);
    });
  });
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

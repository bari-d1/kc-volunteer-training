"use server";

import { z } from "zod";
import {
  QuizError,
  startAttempt,
  submitAttempt,
  type StartedAttempt,
  type SubmittedAttempt,
} from "@/server/quiz";

type Failure = { ok: false; error: QuizError["code"] };

async function run<T>(
  fn: () => Promise<T>,
): Promise<({ ok: true } & T) | Failure> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (error) {
    if (error instanceof QuizError) return { ok: false, error: error.code };
    throw error;
  }
}

/** Starts the final quiz, or resumes the volunteer's unfinished attempt. */
export async function startQuizAction(
  courseSlug: string,
): Promise<({ ok: true } & StartedAttempt) | Failure> {
  const slug = z.string().min(1).safeParse(courseSlug);
  if (!slug.success) return { ok: false, error: "invalid" };
  return run(() => startAttempt(slug.data));
}

/** Submits every answer at once; marking happens on the server. */
export async function submitQuizAction(input: {
  attemptId: string;
  answers: Array<{ questionId: string; optionId: string }>;
}): Promise<({ ok: true } & SubmittedAttempt) | Failure> {
  return run(() => submitAttempt(input));
}

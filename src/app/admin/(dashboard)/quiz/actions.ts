"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import { isUniqueViolation, QuizBankError } from "@/server/admin/inputs";
import {
  applyQuestionBankImport,
  deleteQuestion,
  previewQuestionBankImport,
  saveQuestion,
  setQuestionActive,
  type ImportPreview,
} from "@/server/admin/quiz";

const QuestionId = z.string().regex(/^Q\d{2,}$/);

type Failure = Extract<ActionResult, { ok: false }> & { problems?: string[] };

async function attempt<T>(
  task: () => Promise<T>,
): Promise<{ ok: true; data: T } | Failure> {
  try {
    const data = await task();
    revalidatePath("/admin/quiz", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) return invalid(error);
    if (error instanceof QuizBankError) {
      return {
        ok: false,
        error: error.message,
        fieldErrors: error.fieldErrors,
        problems: error.problems,
      };
    }
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "Someone else just added a question. Please save again.",
      };
    }
    console.error("Question bank change failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Adds a question (id null) or saves one; returns its id. */
export async function saveQuestionAction(id: string | null, input: unknown) {
  await requireAdmin();
  return attempt(() =>
    saveQuestion(id === null ? null : QuestionId.parse(id), input),
  );
}

export async function setQuestionActiveAction(id: string, active: boolean) {
  await requireAdmin();
  return attempt(() => setQuestionActive(QuestionId.parse(id), active));
}

export async function deleteQuestionAction(id: string) {
  await requireAdmin();
  return attempt(() => deleteQuestion(QuestionId.parse(id)));
}

export async function previewImportAction(json: string) {
  await requireAdmin();
  return attempt<ImportPreview>(() => previewQuestionBankImport(json));
}

export async function applyImportAction(json: string) {
  await requireAdmin();
  return attempt<ImportPreview>(() => applyQuestionBankImport(json));
}

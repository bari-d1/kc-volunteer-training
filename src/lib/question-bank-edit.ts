import {
  countDrawUnits,
  QuestionBankSchema,
  type QuestionBank,
} from "@/lib/schemas/question-bank";

/** A question is "hard" under 50% correct, once it has 10 answers. */
export const HARD_MIN_ANSWERS = 10;
export const HARD_MAX_PERCENT = 50;

export function percentCorrect(shown: number, correct: number) {
  return shown > 0 ? Math.round((correct / shown) * 100) : null;
}

export function isHard(shown: number, correct: number) {
  return shown >= HARD_MIN_ANSWERS && correct * 100 < HARD_MAX_PERCENT * shown;
}

/** The next free id after the highest "Qnn", e.g. Q85 → Q86. */
export function nextQuestionId(ids: string[]) {
  const highest = Math.max(
    0,
    ...ids.map((id) => Number(/^Q(\d+)$/.exec(id)?.[1] ?? 0)),
  );
  return `Q${String(highest + 1).padStart(2, "0")}`;
}

/** The next free option id: a, b, c… then o7, o8… past z. */
export function nextOptionId(ids: string[]) {
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    if (!ids.includes(letter)) return letter;
  }
  let n = ids.length + 1;
  while (ids.includes(`o${n}`)) n++;
  return `o${n}`;
}

/**
 * Field errors for changing one question (or removing it, when it's absent
 * from `after`), checked with the same rules as the JSON bank. Problems that
 * were already there before the change don't block it; problems the change
 * creates do. Null when the change is fine.
 */
export function checkBankChange(
  before: QuestionBank,
  after: QuestionBank,
  questionId: string,
): Record<string, string> | null {
  const errors: Record<string, string> = {};
  const index = after.questions.findIndex((q) => q.id === questionId);
  const question = after.questions[index];

  // One required question per group, named whichever comes first.
  if (question?.required && question.group) {
    const other = after.questions.find(
      (q) => q.id !== questionId && q.required && q.group === question.group,
    );
    if (other) {
      errors.required = `“${question.group}” already has a required question (${other.id}). Only one per group can be required.`;
    }
  }

  const { questionsPerAttempt } = after.settings;
  const units = countDrawUnits(after.questions);
  if (units < questionsPerAttempt && units < countDrawUnits(before.questions)) {
    errors._form = `That leaves ${units} different questions to draw from, but each attempt has ${questionsPerAttempt}. Add questions, or lower “Questions per attempt” in Settings.`;
  }
  const required = (bank: QuestionBank) =>
    bank.questions.filter((q) => q.active && q.required).length;
  if (
    required(after) > questionsPerAttempt &&
    required(after) > required(before)
  ) {
    errors._form ??= `That makes ${required(after)} required questions, but each attempt has ${questionsPerAttempt}.`;
  }

  // Everything else the bank checks (topic, options, answer key…), for
  // this question only.
  const result = QuestionBankSchema.safeParse(after);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const [first, at, ...rest] = issue.path;
      if (first !== "questions" || at !== index) continue;
      const key = rest.map(String).join(".") || "_form";
      if (key === "required" || key === "id") continue;
      errors[key] ??=
        key === "correctOptionId" ? "Choose the correct answer" : issue.message;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

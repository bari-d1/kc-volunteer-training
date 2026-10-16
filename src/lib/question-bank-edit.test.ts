import { describe, expect, it } from "vitest";
import type {
  QuestionBank,
  QuestionBankQuestion,
} from "@/lib/schemas/question-bank";
import {
  checkBankChange,
  isHard,
  nextOptionId,
  nextQuestionId,
  percentCorrect,
} from "./question-bank-edit";

const q = (
  id: string,
  extra: Partial<QuestionBankQuestion> = {},
): QuestionBankQuestion => ({
  id,
  topic: "about-kc",
  prompt: `Question ${id}?`,
  options: [
    { id: "a", text: "Yes" },
    { id: "b", text: "No" },
  ],
  correctOptionId: "a",
  explanation: "",
  required: false,
  active: true,
  ...extra,
});

const bank = (
  questions: QuestionBankQuestion[],
  perAttempt = 2,
): QuestionBank => ({
  courseSlug: "volunteers-onboarding",
  version: 1,
  settings: { passMark: 80, questionsPerAttempt: perAttempt },
  sections: [{ topic: "about-kc", title: "About KC" }],
  questions,
});

const edit = (b: QuestionBank, question: QuestionBankQuestion) =>
  checkBankChange(
    b,
    {
      ...b,
      questions: b.questions.map((x) => (x.id === question.id ? question : x)),
    },
    question.id,
  );

describe("question bank edits", () => {
  it("numbers new questions after the highest id", () => {
    expect(nextQuestionId(["Q01", "Q09", "Q97"])).toBe("Q98");
    expect(nextQuestionId(["Q99"])).toBe("Q100");
    expect(nextQuestionId([])).toBe("Q01");
    expect(nextOptionId(["a", "b", "d"])).toBe("c");
  });

  it("flags hard questions only once they have 10 answers", () => {
    expect(isHard(9, 0)).toBe(false);
    expect(isHard(10, 4)).toBe(true);
    expect(isHard(10, 5)).toBe(false);
    expect(percentCorrect(0, 0)).toBeNull();
    expect(percentCorrect(3, 2)).toBe(67);
  });

  it("allows one required question per group", () => {
    const b = bank([
      q("Q01", { group: "rccg", required: true }),
      q("Q02", { group: "rccg" }),
      q("Q03"),
    ]);
    expect(edit(b, q("Q02", { group: "rccg", required: true }))).toEqual({
      required: expect.stringContaining("Q01"),
    });
  });

  it("blocks deactivating below the questions per attempt, but not unrelated edits", () => {
    const b = bank([q("Q01"), q("Q02")]);
    expect(edit(b, q("Q02", { active: false }))?._form).toMatch(
      /leaves 1 different questions/,
    );
    // Already too small: a reword doesn't make it worse.
    const small = bank([q("Q01"), q("Q02")], 5);
    expect(edit(small, q("Q02", { prompt: "Reworded?" }))).toBeNull();
  });

  it("checks the question like the JSON bank does", () => {
    const b = bank([q("Q01"), q("Q02"), q("Q03")]);
    expect(
      edit(b, q("Q02", { prompt: "", topic: "nope", correctOptionId: "z" })),
    ).toMatchObject({
      prompt: expect.any(String),
      topic: expect.stringContaining("Unknown topic"),
      correctOptionId: "Choose the correct answer",
    });
  });
});

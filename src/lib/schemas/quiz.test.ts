import { describe, expect, it } from "vitest";
import {
  PublicQuizQuestionSchema,
  QuizQuestionSchema,
  QuizSubmissionSchema,
} from "@/lib/schemas";

const question = {
  id: "22222222-2222-4222-8222-222222222222",
  prompt: "Who should you tell about a safeguarding concern?",
  options: [
    { id: "a", text: "The Designated Safeguarding Lead" },
    { id: "b", text: "Nobody" },
  ],
  correctOptionId: "a",
  explanation: "Always report concerns to the DSL.",
  isRequired: true,
  isActive: true,
  order: 1,
};

describe("QuizQuestionSchema", () => {
  it("accepts a question with its answer key", () => {
    expect(QuizQuestionSchema.parse(question)).toEqual(question);
  });

  it("applies defaults for flags and order", () => {
    const { isRequired, isActive, order, ...minimal } = question;
    void isRequired;
    void isActive;
    void order;
    expect(QuizQuestionSchema.parse(minimal)).toMatchObject({
      isRequired: false,
      isActive: true,
      order: 0,
    });
  });

  it("rejects a correctOptionId that isn't an option", () => {
    const result = QuizQuestionSchema.safeParse({
      ...question,
      correctOptionId: "c",
    });
    expect(result.error?.issues[0].path).toEqual(["correctOptionId"]);
  });

  it("rejects duplicate option ids", () => {
    const result = QuizQuestionSchema.safeParse({
      ...question,
      options: [
        { id: "a", text: "One" },
        { id: "a", text: "Two" },
      ],
    });
    expect(result.error?.issues[0].path).toEqual(["options", 1, "id"]);
  });

  it("needs at least two options", () => {
    const result = QuizQuestionSchema.safeParse({
      ...question,
      options: [question.options[0]],
    });
    expect(result.success).toBe(false);
  });
});

describe("PublicQuizQuestionSchema", () => {
  it("strips the answer key and admin fields from a full question", () => {
    const publicQuestion = PublicQuizQuestionSchema.parse(question);

    expect(publicQuestion).toEqual({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
    });
    expect(publicQuestion).not.toHaveProperty("correctOptionId");
    expect(publicQuestion).not.toHaveProperty("explanation");
    expect(JSON.stringify(publicQuestion)).not.toContain(question.explanation);
  });

  it("strips extra keys smuggled into options", () => {
    const publicQuestion = PublicQuizQuestionSchema.parse({
      ...question,
      options: [
        { id: "a", text: "One", isCorrect: true },
        { id: "b", text: "Two" },
      ],
    });
    expect(publicQuestion.options[0]).toEqual({ id: "a", text: "One" });
  });
});

describe("QuizSubmissionSchema", () => {
  const answer = { questionId: question.id, optionId: "a" };

  it("accepts a submission", () => {
    expect(
      QuizSubmissionSchema.parse({
        attemptToken: "tok_123",
        answers: [answer],
      }),
    ).toEqual({ attemptToken: "tok_123", answers: [answer] });
  });

  it("rejects answering the same question twice", () => {
    const result = QuizSubmissionSchema.safeParse({
      attemptToken: "tok_123",
      answers: [answer, { ...answer, optionId: "b" }],
    });
    expect(result.error?.issues[0].path).toEqual(["answers", 1, "questionId"]);
  });

  it("rejects an empty submission or missing token", () => {
    expect(
      QuizSubmissionSchema.safeParse({ attemptToken: "t", answers: [] })
        .success,
    ).toBe(false);
    expect(
      QuizSubmissionSchema.safeParse({ attemptToken: "", answers: [answer] })
        .success,
    ).toBe(false);
  });

  it("rejects non-uuid question ids", () => {
    const result = QuizSubmissionSchema.safeParse({
      attemptToken: "t",
      answers: [{ questionId: "1", optionId: "a" }],
    });
    expect(result.success).toBe(false);
  });
});

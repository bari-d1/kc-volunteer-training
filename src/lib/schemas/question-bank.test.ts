import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  countDrawUnits,
  formatQuestionBankIssues,
  QuestionBankSchema,
  summarizeQuestionBank,
  type QuestionBank,
} from "./question-bank";
import {
  QUESTION_BANK_SCHEMA_PATH,
  renderQuestionBankJsonSchema,
} from "./question-bank-json-schema";

const BANK_PATH = "content/quizzes/volunteers-onboarding.json";
const realBank: QuestionBank = JSON.parse(readFileSync(BANK_PATH, "utf8"));

/** A fresh copy of the real bank to break in one way. */
const bank = (): QuestionBank => structuredClone(realBank);

/** The formatted problems, as pnpm quiz:validate prints them. */
function problems(input: unknown) {
  const result = QuestionBankSchema.safeParse(input);
  return result.success
    ? []
    : formatQuestionBankIssues(result.error.issues, input);
}

describe("QuestionBankSchema", () => {
  it("accepts the real question bank", () => {
    expect(problems(realBank)).toEqual([]);
  });

  it("rejects a duplicate question id", () => {
    const input = bank();
    input.questions[1].id = input.questions[0].id;
    expect(problems(input)).toEqual([
      `${input.questions[0].id} id: Duplicate question id "${input.questions[0].id}"`,
    ]);
  });

  it("rejects a correct answer that isn't an option", () => {
    const input = bank();
    const question = input.questions[4];
    question.correctOptionId = "z";
    const ids = question.options.map((o) => o.id).join(", ");
    expect(problems(input)).toEqual([
      `${question.id} correctOptionId: "z" isn't one of the options (${ids})`,
    ]);
  });

  it("rejects a duplicate option id", () => {
    const input = bank();
    const question = input.questions[2];
    question.options[1].id = question.options[0].id;
    question.correctOptionId = question.options[0].id;
    expect(problems(input)).toEqual([
      `${question.id} options.1.id: Duplicate option id "${question.options[0].id}"`,
    ]);
  });

  it("rejects a topic that isn't in sections", () => {
    const input = bank();
    input.questions[7].topic = "giving";
    const [problem] = problems(input);
    expect(problem).toMatch(
      new RegExp(`^${input.questions[7].id} topic: Unknown topic "giving"`),
    );
    expect(problem).toContain("about-kc");
  });

  it("rejects too few draw units for an attempt", () => {
    const input = bank();
    const units = countDrawUnits(input.questions);
    input.settings.questionsPerAttempt = units + 1;
    expect(problems(input)).toEqual([
      `settings.questionsPerAttempt: Only ${units} draw units (each group counts once) for ${units + 1} questions per attempt; add questions or groups, or lower questionsPerAttempt`,
    ]);
  });

  it("only counts active questions, and each group once", () => {
    const questions = bank().questions.slice(0, 3);
    questions[0].group = "same";
    questions[1].group = "same";
    questions[2].group = undefined;
    expect(countDrawUnits(questions)).toBe(2);
    questions[2].active = false;
    expect(countDrawUnits(questions)).toBe(1);
  });

  it("allows one required question per group", () => {
    const input = bank();
    const grouped = input.questions.filter(
      (q) => q.group === "spiritual-costco",
    );
    expect(grouped.length).toBeGreaterThan(1);
    grouped[0].required = true;
    expect(problems(input)).toEqual([]);
    grouped[1].required = true;
    expect(problems(input)).toEqual([
      `${grouped[1].id} required: Group "spiritual-costco" already has a required question (${grouped[0].id})`,
    ]);
  });

  it("rejects more required questions than an attempt holds", () => {
    const input = bank();
    input.settings.questionsPerAttempt = 2;
    for (const q of input.questions.filter((q) => !q.group).slice(0, 3)) {
      q.required = true;
    }
    expect(problems(input)).toContain(
      "settings.questionsPerAttempt: 3 active questions are required, but an attempt only has 2",
    );
  });

  it("names the field for shape errors", () => {
    const input = bank() as unknown as {
      questions: Array<Record<string, unknown>>;
    };
    input.questions[0].options = [{ id: "a", text: "Only one" }];
    input.questions[0].correctOptionId = "a";
    expect(problems(input)).toEqual([
      "Q01 options: Too small: expected array to have >=2 items",
    ]);
  });
});

describe("summarizeQuestionBank", () => {
  it("counts questions, groups, draw units and topics", () => {
    const summary = summarizeQuestionBank(QuestionBankSchema.parse(realBank));
    expect(summary.questions).toBe(realBank.questions.length);
    expect(summary.drawUnits).toBeGreaterThanOrEqual(
      realBank.settings.questionsPerAttempt,
    );
    expect(summary.byTopic.map((t) => t.topic)).toEqual(
      realBank.sections.map((s) => s.topic),
    );
    expect(summary.byTopic.reduce((n, t) => n + t.questions, 0)).toBe(
      summary.questions,
    );
  });
});

describe("question-bank.schema.json", () => {
  it("is up to date (run pnpm quiz:schema)", async () => {
    expect(readFileSync(QUESTION_BANK_SCHEMA_PATH, "utf8")).toBe(
      await renderQuestionBankJsonSchema(),
    );
  });

  it("is the schema the bank points at", () => {
    expect(realBank.$schema).toBe("./question-bank.schema.json");
  });
});

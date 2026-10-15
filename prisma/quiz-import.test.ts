import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { QuestionBank } from "@/lib/schemas/question-bank";
import {
  describeImport,
  importQuestionBank,
  loadQuestionBank,
  planQuestions,
  questionBankFiles,
  toQuestionData,
  type ExistingQuestion,
} from "./quiz-import";

const REAL_BANK = "content/quizzes/volunteers-onboarding.json";

function smallBank(): QuestionBank {
  const option = (id: string) => ({ id, text: `Option ${id}` });
  const question = (id: string, extra: object = {}) => ({
    id,
    topic: "about-kc",
    prompt: `Question ${id}?`,
    options: [option("a"), option("b")],
    correctOptionId: "a",
    explanation: "",
    required: false,
    active: true,
    ...extra,
  });
  return {
    courseSlug: "volunteers-onboarding",
    version: 1,
    settings: { passMark: 80, questionsPerAttempt: 2 },
    sections: [
      { topic: "about-kc", title: "About KC" },
      { topic: "recap", title: "Recap" },
    ],
    questions: [
      question("Q01"),
      question("Q02", { group: "g" }),
      question("Q03", { group: "g", topic: "recap" }),
    ],
  };
}

/** Database rows for a bank, as if it had already been imported. */
function rowsFor(bank: QuestionBank): ExistingQuestion[] {
  return structuredClone(toQuestionData(bank)).map((data) => ({
    id: data.externalId,
    ...data,
  }));
}

describe("planQuestions", () => {
  it("adds every question to an empty course", () => {
    const plan = planQuestions(smallBank(), []);
    expect(plan.add.map((q) => q.externalId)).toEqual(["Q01", "Q02", "Q03"]);
    expect(plan.add[2]).toMatchObject({
      topic: "recap",
      group: "g",
      isRequired: false,
      isActive: true,
      order: 2,
    });
    expect(plan.update).toEqual([]);
    expect(plan.deactivate).toEqual([]);
  });

  it("changes nothing when the database already matches", () => {
    const bank = smallBank();
    const plan = planQuestions(bank, rowsFor(bank));
    expect(plan).toEqual({ add: [], update: [], deactivate: [], unchanged: 3 });
  });

  it("updates only questions whose fields changed, and says which", () => {
    const bank = smallBank();
    const rows = rowsFor(bank);
    bank.questions[1].prompt = "Reworded?";
    bank.questions[1].required = true;
    bank.questions[2].options[1].text = "Fixed typo";
    const plan = planQuestions(bank, rows);
    expect(plan.update.map((u) => [u.data.externalId, u.changed])).toEqual([
      ["Q02", ["prompt", "isRequired"]],
      ["Q03", ["options"]],
    ]);
    expect(plan.unchanged).toBe(1);
  });

  it("deactivates active questions missing from the file, including ones without an id", () => {
    const bank = smallBank();
    const rows = rowsFor(bank);
    bank.questions.pop();
    const legacy = { ...rows[0], id: "legacy", externalId: null };
    const alreadyOff = { ...rows[0], id: "old", externalId: "Q99" };
    alreadyOff.isActive = false;
    const plan = planQuestions(bank, [...rows, legacy, alreadyOff]);
    expect(plan.deactivate.map((q) => q.id)).toEqual(["Q03", "legacy"]);
  });

  it("reactivates a question that's back in the file", () => {
    const bank = smallBank();
    const rows = rowsFor(bank);
    rows[0].isActive = false;
    expect(planQuestions(bank, rows).update[0].changed).toEqual(["isActive"]);
  });
});

/** In-memory stand-in for the four tables the importer touches. */
function fakeDb(existing: ExistingQuestion[] = []) {
  const writes: string[] = [];
  const db = {
    course: {
      findUnique: async ({ where }: { where: { slug: string } }) =>
        where.slug === "volunteers-onboarding" ? { id: "course-1" } : null,
    },
    quizQuestion: {
      findMany: async () => existing,
      createMany: async ({ data }: { data: unknown[] }) => {
        writes.push(`createMany ${data.length}`);
      },
      update: async ({ where }: { where: { id: string } }) => {
        writes.push(`update ${where.id}`);
      },
      updateMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        writes.push(`deactivate ${where.id.in.join(",")}`);
      },
    },
    quizSection: {
      findMany: async () => [{ topic: "gone", title: "Gone", order: 0 }],
      deleteMany: async ({ where }: { where: { topic: { in: string[] } } }) => {
        writes.push(`delete sections ${where.topic.in.join(",")}`);
      },
      upsert: async ({
        where,
      }: {
        where: { courseId_topic: { topic: string } };
      }) => {
        writes.push(`upsert section ${where.courseId_topic.topic}`);
      },
    },
    siteSetting: {
      findUnique: async () => ({
        key: "quiz",
        value: { passMark: 70, questionsPerAttempt: 2 },
      }),
      upsert: async ({ update }: { update: { value: unknown } }) => {
        writes.push(`settings ${JSON.stringify(update.value)}`);
      },
    },
  };
  return {
    db: db as unknown as Parameters<typeof importQuestionBank>[0],
    writes,
  };
}

describe("importQuestionBank", () => {
  it("writes questions, sections and settings", async () => {
    const bank = smallBank();
    const rows = rowsFor(bank);
    rows[1].prompt = "Old wording?";
    const legacy = { ...rows[0], id: "legacy", externalId: null };
    const { db, writes } = fakeDb([rows[1], legacy]);

    const report = await importQuestionBank(db, bank);
    expect(writes).toEqual([
      "createMany 2",
      "update Q02",
      "deactivate legacy",
      "delete sections gone",
      "upsert section about-kc",
      "upsert section recap",
      'settings {"passMark":80,"questionsPerAttempt":2}',
    ]);
    expect(report.sections).toEqual({
      add: ["about-kc", "recap"],
      update: [],
      remove: ["gone"],
    });
    expect(describeImport(report)).toEqual([
      "Questions: 2 added, 1 updated, 1 deactivated, 0 unchanged",
      "Sections:  2 added, 0 updated, 1 removed",
      "Settings:  updated",
    ]);
  });

  it("writes nothing on a dry run, but reports the same plan", async () => {
    const { db, writes } = fakeDb();
    const report = await importQuestionBank(db, smallBank(), { dryRun: true });
    expect(writes).toEqual([]);
    expect(report.questions.add).toHaveLength(3);
    expect(describeImport(report, { dryRun: true, verbose: true })).toContain(
      "  + Q01 Question Q01?",
    );
  });

  it("fails when the course doesn't exist", async () => {
    const { db, writes } = fakeDb();
    const bank = { ...smallBank(), courseSlug: "missing" };
    await expect(importQuestionBank(db, bank)).rejects.toThrow(
      'No course with slug "missing"',
    );
    expect(writes).toEqual([]);
  });
});

describe("loading banks", () => {
  it("loads and validates the real bank", () => {
    expect(loadQuestionBank(REAL_BANK).questions.length).toBeGreaterThan(0);
  });

  it("lists every bank but not the JSON Schema", () => {
    const files = questionBankFiles();
    expect(files).toContain(REAL_BANK);
    expect(files.some((f) => f.endsWith(".schema.json"))).toBe(false);
  });

  it("aborts with every problem when the file is invalid", () => {
    const bank = smallBank();
    bank.questions[1].id = "Q01";
    bank.questions[2].correctOptionId = "z";
    const dir = mkdtempSync(path.join(tmpdir(), "quiz-bank-"));
    const file = path.join(dir, "bank.json");
    writeFileSync(file, JSON.stringify(bank));
    expect(() => loadQuestionBank(file)).toThrow(
      `${file} is invalid (2 problem(s)):\n  - Q01 id: Duplicate question id "Q01"\n  - Q03 correctOptionId: "z" isn't one of the options (a, b)`,
    );
  });
});

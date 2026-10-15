/**
 * Syncs a question bank JSON file (content/quizzes/*.json) into the database.
 * Used by pnpm quiz:import and pnpm db:seed.
 *
 * Questions are matched by (courseId, externalId). Questions in the database
 * but not in the file are deactivated, never deleted, so past attempts keep
 * their history.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import {
  formatQuestionBankIssues,
  QuestionBankSchema,
  type QuestionBank,
} from "@/lib/schemas/question-bank";

export const QUESTION_BANK_DIR = "content/quizzes";

/** Every bank in content/quizzes, skipping the JSON Schema. */
export function questionBankFiles(dir = QUESTION_BANK_DIR) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.endsWith(".schema.json"))
    .sort()
    .map((name) => path.join(dir, name));
}

/** Reads and validates a bank. Throws one error listing every problem. */
export function loadQuestionBank(file: string): QuestionBank {
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Can't read ${file}: ${(error as Error).message}`);
  }
  const result = QuestionBankSchema.safeParse(input);
  if (!result.success) {
    const lines = formatQuestionBankIssues(result.error.issues, input);
    throw new Error(
      `${file} is invalid (${lines.length} problem(s)):\n  - ${lines.join("\n  - ")}`,
    );
  }
  return result.data;
}

// ─── Planning ───────────────────────────────────────────────────────────────

type QuestionData = {
  externalId: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  topic: string;
  group: string | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
};

export type ExistingQuestion = Omit<QuestionData, "externalId" | "options"> & {
  id: string;
  externalId: string | null;
  options: unknown;
};

const COMPARED = [
  "prompt",
  "options",
  "correctOptionId",
  "explanation",
  "topic",
  "group",
  "isRequired",
  "isActive",
  "order",
] as const satisfies ReadonlyArray<keyof QuestionData>;

export type QuestionPlan = {
  add: QuestionData[];
  update: Array<{ id: string; data: QuestionData; changed: string[] }>;
  deactivate: Array<{ id: string; externalId: string | null; prompt: string }>;
  unchanged: number;
};

export function toQuestionData(bank: QuestionBank): QuestionData[] {
  return bank.questions.map((q, order) => ({
    externalId: q.id,
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    topic: q.topic,
    group: q.group ?? null,
    isRequired: q.required,
    isActive: q.active,
    order,
  }));
}

/** What an import would change, given the course's current questions. */
export function planQuestions(
  bank: QuestionBank,
  existing: ExistingQuestion[],
): QuestionPlan {
  const byExternalId = new Map(
    existing.flatMap((row) => (row.externalId ? [[row.externalId, row]] : [])),
  );
  const plan: QuestionPlan = {
    add: [],
    update: [],
    deactivate: [],
    unchanged: 0,
  };
  const inFile = new Set<string>();

  for (const data of toQuestionData(bank)) {
    inFile.add(data.externalId);
    const row = byExternalId.get(data.externalId);
    if (!row) {
      plan.add.push(data);
      continue;
    }
    const changed = COMPARED.filter(
      (key) => JSON.stringify(row[key]) !== JSON.stringify(data[key]),
    );
    if (changed.length > 0) plan.update.push({ id: row.id, data, changed });
    else plan.unchanged++;
  }

  for (const row of existing) {
    if (row.isActive && !(row.externalId && inFile.has(row.externalId))) {
      plan.deactivate.push({
        id: row.id,
        externalId: row.externalId,
        prompt: row.prompt,
      });
    }
  }
  return plan;
}

// ─── Importing ──────────────────────────────────────────────────────────────

export type ImportReport = {
  courseSlug: string;
  questions: QuestionPlan;
  sections: { add: string[]; update: string[]; remove: string[] };
  settingsChanged: boolean;
};

type Db = Pick<
  Prisma.TransactionClient,
  "course" | "quizQuestion" | "quizSection" | "siteSetting"
>;

/**
 * Syncs one bank. Pass a transaction client so a failure leaves nothing
 * half-written. With dryRun, only reads and returns the report.
 */
export async function importQuestionBank(
  db: Db,
  bank: QuestionBank,
  { dryRun = false } = {},
): Promise<ImportReport> {
  const course = await db.course.findUnique({
    where: { slug: bank.courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(`No course with slug "${bank.courseSlug}"`);
  }
  const courseId = course.id;

  const existing = await db.quizQuestion.findMany({
    where: { courseId },
    select: {
      id: true,
      externalId: true,
      prompt: true,
      options: true,
      correctOptionId: true,
      explanation: true,
      topic: true,
      group: true,
      isRequired: true,
      isActive: true,
      order: true,
    },
  });
  const questions = planQuestions(bank, existing);

  const existingSections = await db.quizSection.findMany({
    where: { courseId },
    select: { topic: true, title: true, order: true },
  });
  const sectionByTopic = new Map(existingSections.map((s) => [s.topic, s]));
  const fileTopics = new Set(bank.sections.map((s) => s.topic));
  const sections: ImportReport["sections"] = {
    add: [],
    update: [],
    remove: existingSections
      .filter((s) => !fileTopics.has(s.topic))
      .map((s) => s.topic),
  };
  bank.sections.forEach(({ topic, title }, order) => {
    const row = sectionByTopic.get(topic);
    if (!row) sections.add.push(topic);
    else if (row.title !== title || row.order !== order)
      sections.update.push(topic);
  });

  const settings = {
    passMark: bank.settings.passMark,
    questionsPerAttempt: bank.settings.questionsPerAttempt,
  };
  const currentSettings = await db.siteSetting.findUnique({
    where: { key: "quiz" },
  });
  const settingsChanged =
    JSON.stringify(currentSettings?.value) !== JSON.stringify(settings);

  const report = {
    courseSlug: bank.courseSlug,
    questions,
    sections,
    settingsChanged,
  };
  if (dryRun) return report;

  if (questions.add.length > 0) {
    await db.quizQuestion.createMany({
      data: questions.add.map((data) => ({ ...data, courseId })),
    });
  }
  for (const { id, data } of questions.update) {
    await db.quizQuestion.update({ where: { id }, data });
  }
  if (questions.deactivate.length > 0) {
    await db.quizQuestion.updateMany({
      where: { id: { in: questions.deactivate.map((q) => q.id) } },
      data: { isActive: false },
    });
  }

  if (sections.remove.length > 0) {
    await db.quizSection.deleteMany({
      where: { courseId, topic: { in: sections.remove } },
    });
  }
  for (const [order, { topic, title }] of bank.sections.entries()) {
    await db.quizSection.upsert({
      where: { courseId_topic: { courseId, topic } },
      create: { courseId, topic, title, order },
      update: { title, order },
    });
  }

  if (settingsChanged) {
    await db.siteSetting.upsert({
      where: { key: "quiz" },
      create: { key: "quiz", value: settings },
      update: { value: settings },
    });
  }
  return report;
}

/** A readable summary of an import, for the CLI and the seed. */
export function describeImport(
  report: ImportReport,
  { dryRun = false, verbose = false } = {},
) {
  const { questions, sections } = report;
  const verb = (done: string, todo: string) => (dryRun ? todo : done);
  const add = verb("added", "to add");
  const update = verb("updated", "to update");
  const lines = [
    `Questions: ${questions.add.length} ${add}, ${questions.update.length} ${update}, ${questions.deactivate.length} ${verb("deactivated", "to deactivate")}, ${questions.unchanged} unchanged`,
    `Sections:  ${sections.add.length} ${add}, ${sections.update.length} ${update}, ${sections.remove.length} ${verb("removed", "to remove")}`,
    `Settings:  ${report.settingsChanged ? verb("updated", "will change") : "unchanged"}`,
  ];
  if (verbose) {
    for (const q of questions.add)
      lines.push(`  + ${q.externalId} ${q.prompt}`);
    for (const q of questions.update) {
      lines.push(`  ~ ${q.data.externalId} (${q.changed.join(", ")})`);
    }
    for (const q of questions.deactivate) {
      lines.push(`  - ${q.externalId ?? "(no id)"} ${q.prompt}`);
    }
    for (const topic of sections.add) lines.push(`  + section ${topic}`);
    for (const topic of sections.update) lines.push(`  ~ section ${topic}`);
    for (const topic of sections.remove) lines.push(`  - section ${topic}`);
  }
  return lines;
}

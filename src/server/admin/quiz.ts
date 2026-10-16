import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import {
  checkBankChange,
  isHard,
  nextQuestionId,
  percentCorrect,
} from "@/lib/question-bank-edit";
import {
  countDrawUnits,
  formatQuestionBankIssues,
  QuestionBankQuestionSchema,
  QuestionBankSchema,
  type QuestionBank,
  type QuestionBankQuestion,
} from "@/lib/schemas/question-bank";
import { QuizOptionSchema } from "@/lib/schemas/quiz";
import { QuizSettingSchema } from "@/lib/schemas/site-settings";
import { importQuestionBank, type ImportReport } from "../quiz-import";
import { logChange } from "./change-log";
import { QuizBankError } from "./inputs";

/** Used when Settings has no quiz values yet (same as the engine). */
const DEFAULT_SETTINGS = { passMark: 80, questionsPerAttempt: 10 };

type QuestionRow = Awaited<ReturnType<typeof loadBank>>["rows"][number];

/** A database question in the JSON bank's shape (and key order). */
function toBankQuestion(row: QuestionRow): QuestionBankQuestion {
  return {
    id: row.externalId!,
    topic: row.topic,
    ...(row.group && { group: row.group }),
    prompt: row.prompt,
    options: z.array(QuizOptionSchema).parse(row.options),
    correctOptionId: row.correctOptionId,
    explanation: row.explanation,
    required: row.isRequired,
    active: row.isActive,
  };
}

/** The default course's bank as it is now, plus the rows behind it. */
async function loadBank() {
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: DEFAULT_COURSE_SLUG },
    select: { id: true, slug: true },
  });
  const [sections, rows, setting] = await Promise.all([
    prisma.quizSection.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: { topic: true, title: true },
    }),
    prisma.quizQuestion.findMany({
      // Questions without a bank id can't be exported or edited here.
      where: { courseId: course.id, externalId: { not: null } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        externalId: true,
        topic: true,
        group: true,
        prompt: true,
        options: true,
        correctOptionId: true,
        explanation: true,
        isRequired: true,
        isActive: true,
        order: true,
      },
    }),
    prisma.siteSetting.findUnique({ where: { key: "quiz" } }),
  ]);
  const settings =
    QuizSettingSchema.safeParse(setting?.value).data ?? DEFAULT_SETTINGS;
  const bank: QuestionBank = {
    $schema: "./question-bank.schema.json",
    courseSlug: course.slug,
    // Nothing reads the version; the file in the repo starts at 1.
    version: 1,
    settings,
    sections,
    questions: rows.map(toBankQuestion),
  };
  return { course, bank, rows };
}

/**
 * Times each question was shown in a submitted attempt, and answered
 * correctly, marked against the question as it was in that attempt.
 */
async function questionStats(courseId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; shown: number; correct: number }>
  >`
    SELECT ids.id,
           count(*)::int AS shown,
           count(*) FILTER (
             WHERE a.answers ->> ids.id = coalesce(snap.correct, q."correctOptionId")
           )::int AS correct
    FROM "QuizAttempt" a
    CROSS JOIN LATERAL jsonb_array_elements_text(a."questionIds") AS ids(id)
    LEFT JOIN LATERAL (
      SELECT s ->> 'correctOptionId' AS correct
      FROM jsonb_array_elements(coalesce(a.questions, '[]'::jsonb)) AS s
      WHERE s ->> 'id' = ids.id
      LIMIT 1
    ) snap ON true
    LEFT JOIN "QuizQuestion" q ON q.id::text = ids.id
    WHERE a."courseId" = ${courseId}::uuid AND a."submittedAt" IS NOT NULL
    GROUP BY ids.id`;
  return new Map(rows.map((r) => [r.id, r]));
}

function withStats(
  row: QuestionRow,
  stats: Map<string, { shown: number; correct: number }>,
) {
  const { shown = 0, correct = 0 } = stats.get(row.id) ?? {};
  return {
    shown,
    correct,
    percentCorrect: percentCorrect(shown, correct),
    hard: isHard(shown, correct),
  };
}

export type QuestionBankRow = Awaited<
  ReturnType<typeof getQuestionBankOverview>
>["questions"][number];

/** Every question with its stats, and what the table and group view need. */
export async function getQuestionBankOverview() {
  await requireAdmin();
  const { course, bank, rows } = await loadBank();
  const stats = await questionStats(course.id);
  const titles = new Map(bank.sections.map((s) => [s.topic, s.title]));
  return {
    settings: bank.settings,
    sections: bank.sections,
    drawUnits: countDrawUnits(bank.questions),
    required: bank.questions.filter((q) => q.active && q.required).length,
    questions: rows.map((row) => ({
      id: row.externalId!,
      prompt: row.prompt,
      topic: row.topic,
      topicTitle: titles.get(row.topic) ?? row.topic,
      group: row.group,
      active: row.isActive,
      required: row.isRequired,
      ...withStats(row, stats),
    })),
  };
}

/** Whether any attempt, submitted or not, has drawn this question. */
async function usedInAttempt(questionUuid: string) {
  const rows = await prisma.$queryRaw<Array<{ used: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "QuizAttempt"
      WHERE "questionIds" @> jsonb_build_array(${questionUuid}::text)
    ) AS used`;
  return rows[0]?.used ?? false;
}

/**
 * What the edit page needs: the question (null for a new one, with the id
 * it will get), its stats, the topics and the existing groups.
 */
export async function getQuestionEditor(externalId: string | null) {
  await requireAdmin();
  const { course, bank, rows } = await loadBank();
  const groups = [
    ...new Set(rows.flatMap((r) => (r.group ? [r.group] : []))),
  ].sort();
  const base = {
    sections: bank.sections,
    groups,
    questionsPerAttempt: bank.settings.questionsPerAttempt,
  };
  if (externalId === null) {
    return {
      ...base,
      id: nextQuestionId(bank.questions.map((q) => q.id)),
      question: null,
      stats: null,
      used: false,
    };
  }
  const row = rows.find((r) => r.externalId === externalId);
  if (!row) return null;
  const stats = await questionStats(course.id);
  return {
    ...base,
    id: externalId,
    question: toBankQuestion(row),
    stats: withStats(row, stats),
    used: await usedInAttempt(row.id),
  };
}

const QuestionInputSchema = QuestionBankQuestionSchema.omit({ id: true });

function toRowData(q: Omit<QuestionBankQuestion, "id">) {
  return {
    topic: q.topic,
    group: q.group ?? null,
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    isRequired: q.required,
    isActive: q.active,
  };
}

/** Throws QuizBankError if the change breaks the bank's rules. */
function assertChange(
  before: QuestionBank,
  questions: QuestionBankQuestion[],
  questionId: string,
) {
  const errors = checkBankChange(before, { ...before, questions }, questionId);
  if (errors) throw new QuizBankError(errors);
}

/**
 * Adds a question (externalId null: it gets the next free id, last in the
 * bank) or edits one. Validated against the whole bank, like the JSON file.
 * Attempts already started keep the version they drew.
 */
export async function saveQuestion(externalId: string | null, input: unknown) {
  await requireAdmin();
  const data = QuestionInputSchema.parse(input);
  const { course, bank, rows } = await loadBank();

  if (externalId === null) {
    const id = nextQuestionId(bank.questions.map((q) => q.id));
    assertChange(bank, [...bank.questions, { id, ...data }], id);
    const order = Math.max(-1, ...rows.map((r) => r.order)) + 1;
    return prisma.$transaction(async (tx) => {
      const row = await tx.quizQuestion.create({
        data: {
          ...toRowData(data),
          courseId: course.id,
          externalId: id,
          order,
        },
      });
      await logChange(tx, "QuizQuestion", row.id, "create", `Added ${id}`);
      return { id };
    });
  }

  if (!bank.questions.some((q) => q.id === externalId)) {
    throw new QuizBankError({ _form: "That question no longer exists." });
  }
  assertChange(
    bank,
    bank.questions.map((q) => (q.id === externalId ? { ...q, ...data } : q)),
    externalId,
  );
  return prisma.$transaction(async (tx) => {
    const row = await tx.quizQuestion.update({
      where: { courseId_externalId: { courseId: course.id, externalId } },
      data: toRowData(data),
    });
    await logChange(
      tx,
      "QuizQuestion",
      row.id,
      "update",
      `Edited ${externalId}`,
    );
    return { id: externalId };
  });
}

/** Turns a question on or off for new attempts. */
export async function setQuestionActive(externalId: string, active: boolean) {
  await requireAdmin();
  const { course, bank } = await loadBank();
  if (!bank.questions.some((q) => q.id === externalId)) {
    throw new QuizBankError({ _form: "That question no longer exists." });
  }
  assertChange(
    bank,
    bank.questions.map((q) =>
      q.id === externalId ? { ...q, active: active === true } : q,
    ),
    externalId,
  );
  await prisma.$transaction(async (tx) => {
    const row = await tx.quizQuestion.update({
      where: { courseId_externalId: { courseId: course.id, externalId } },
      data: { isActive: active === true },
    });
    await logChange(
      tx,
      "QuizQuestion",
      row.id,
      active ? "publish" : "unpublish",
      `${active ? "Activated" : "Deactivated"} ${externalId}`,
    );
  });
}

/**
 * Deletes a question no attempt has ever drawn (e.g. one added by mistake).
 * Used questions can only be deactivated, so attempts keep their history.
 */
export async function deleteQuestion(externalId: string) {
  await requireAdmin();
  const { bank, rows } = await loadBank();
  const row = rows.find((r) => r.externalId === externalId);
  if (!row) return;
  if (await usedInAttempt(row.id)) {
    throw new QuizBankError({
      _form:
        "This question has been in an attempt, so it can't be deleted. Deactivate it instead.",
    });
  }
  assertChange(
    bank,
    bank.questions.filter((q) => q.id !== externalId),
    externalId,
  );
  await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.delete({ where: { id: row.id } });
    await logChange(
      tx,
      "QuizQuestion",
      row.id,
      "delete",
      `Deleted ${externalId}`,
    );
  });
}

/**
 * The bank in the same JSON shape as content/quizzes/<course>.json, so it
 * can be committed back to the repo. Settings come from Admin → Settings.
 */
export async function exportQuestionBank() {
  await requireAdmin();
  return (await loadBank()).bank;
}

// ─── Import ─────────────────────────────────────────────────────────────────

export type ImportPreview = {
  questions: {
    add: Array<{ id: string; prompt: string }>;
    update: Array<{ id: string; prompt: string; changed: string[] }>;
    deactivate: Array<{ id: string; prompt: string }>;
    unchanged: number;
  };
  sections: ImportReport["sections"];
  settingsChanged: boolean;
};

/** Parses and checks an uploaded bank, or throws QuizBankError. */
async function parseUpload(json: unknown) {
  const text = z.string().max(2_000_000).parse(json);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new QuizBankError({ _form: "That file isn't valid JSON." });
  }
  const result = QuestionBankSchema.safeParse(input);
  if (!result.success) {
    const problems = formatQuestionBankIssues(result.error.issues, input);
    throw new QuizBankError(
      {
        _form: `The file has ${problems.length} problem${problems.length === 1 ? "" : "s"}.`,
      },
      problems,
    );
  }
  const bank = result.data;
  if (bank.courseSlug !== DEFAULT_COURSE_SLUG) {
    throw new QuizBankError({
      _form: `This bank is for “${bank.courseSlug}”, not “${DEFAULT_COURSE_SLUG}”.`,
    });
  }

  // The bank is checked against its own settings above; Settings may differ.
  const { bank: current } = await loadBank();
  const { questionsPerAttempt } = current.settings;
  const units = countDrawUnits(bank.questions);
  if (units < questionsPerAttempt) {
    throw new QuizBankError({
      _form: `This bank has ${units} different questions to draw from, but Settings has ${questionsPerAttempt} per attempt. Lower that in Settings first, or add questions.`,
    });
  }
  return bank;
}

const PATH_LABELS: Record<string, string> = {
  isRequired: "required",
  isActive: "active",
  correctOptionId: "correct answer",
};

function toPreview(report: ImportReport): ImportPreview {
  const { questions } = report;
  return {
    questions: {
      add: questions.add.map((q) => ({ id: q.externalId, prompt: q.prompt })),
      update: questions.update.map((q) => ({
        id: q.data.externalId,
        prompt: q.data.prompt,
        changed: q.changed.map((key) => PATH_LABELS[key] ?? key),
      })),
      deactivate: questions.deactivate.map((q) => ({
        id: q.externalId ?? "(no id)",
        prompt: q.prompt,
      })),
      unchanged: questions.unchanged,
    },
    sections: report.sections,
    settingsChanged: report.settingsChanged,
  };
}

/** What importing this JSON would change. Writes nothing. */
export async function previewQuestionBankImport(json: unknown) {
  await requireAdmin();
  const bank = await parseUpload(json);
  return toPreview(await importQuestionBank(prisma, bank, { dryRun: true }));
}

/**
 * Imports the JSON with the same importer as `pnpm quiz:import`: questions
 * matched by id are updated, new ones added, missing ones deactivated
 * (never deleted). Quiz settings stay as they are in Settings.
 */
export async function applyQuestionBankImport(json: unknown) {
  await requireAdmin();
  const bank = await parseUpload(json);
  const report = await prisma.$transaction(
    async (tx) => {
      const report = await importQuestionBank(tx, bank);
      const { add, update, deactivate } = report.questions;
      await logChange(
        tx,
        "QuizQuestion",
        "bank",
        "update",
        `Imported the question bank: ${add.length} added, ${update.length} updated, ${deactivate.length} deactivated`,
      );
      return report;
    },
    // One update per changed question; allow for a slow connection.
    { timeout: 60_000 },
  );
  return toPreview(report);
}

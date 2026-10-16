import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireVolunteer, type VolunteerId } from "@/lib/auth";
import { FINAL_QUIZ_SLUG } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import { nextCertificateNumber } from "./certificate-number";
import { sendCompletionEmail } from "./notifications";
import {
  PublicQuizQuestionSchema,
  QuizOptionSchema,
  QuizSubmissionSchema,
  snapshotQuestions,
  type PublicQuizQuestion,
  type QuizOption,
} from "@/lib/schemas/quiz";
import {
  QuizSettingSchema,
  type QuizSetting,
} from "@/lib/schemas/site-settings";

export { FINAL_QUIZ_SLUG };

/** An unsubmitted attempt younger than this is resumed instead of redrawn. */
export const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;

const DEFAULT_SETTINGS: QuizSetting = { passMark: 80, questionsPerAttempt: 10 };

export class QuizError extends Error {
  constructor(
    readonly code:
      | "not-found"
      | "locked"
      | "invalid"
      | "already-submitted"
      | "expired"
      | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "QuizError";
  }
}

// ─── Drawing (pure) ─────────────────────────────────────────────────────────

type Drawable = { id: string; group: string | null; isRequired: boolean };

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks an attempt's questions from the active ones: every required
 * question, then random draw units (a whole group counts as one unit and
 * contributes one random question) until there are `count`. A group already
 * represented by a required question isn't drawn again, so an attempt never
 * has two questions testing the same fact. Returned in random order.
 */
export function drawQuestions<Q extends Drawable>(
  questions: readonly Q[],
  count: number,
  random = Math.random,
): Q[] {
  const required = questions.filter((q) => q.isRequired);
  const usedGroups = new Set(required.flatMap((q) => q.group ?? []));

  const units: Q[][] = [];
  const groups = new Map<string, Q[]>();
  for (const question of questions) {
    if (question.isRequired) continue;
    if (!question.group) {
      units.push([question]);
    } else if (!usedGroups.has(question.group)) {
      const members = groups.get(question.group);
      if (members) members.push(question);
      else groups.set(question.group, [question]);
    }
  }
  units.push(...groups.values());

  const picked = shuffle(units, random)
    .slice(0, Math.max(count - required.length, 0))
    .map((unit) => unit[Math.floor(random() * unit.length)]);
  return shuffle([...required, ...picked], random);
}

// ─── Loading ────────────────────────────────────────────────────────────────

const QuestionIdsSchema = z.array(z.uuid());
const OptionOrderSchema = z.record(z.string(), z.array(z.string()));
const AnswersSchema = z.record(z.string(), z.string());
const OptionsSchema = z.array(QuizOptionSchema);

async function getSettings(
  db: Pick<Prisma.TransactionClient, "siteSetting">,
): Promise<QuizSetting> {
  const row = await db.siteSetting.findUnique({ where: { key: "quiz" } });
  const parsed = QuizSettingSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/**
 * The course and its Final Quiz module, confirming every published module
 * before the quiz is complete for this volunteer.
 */
async function assertQuizUnlocked(profileId: VolunteerId, courseSlug: string) {
  const course = await prisma.course.findFirst({
    where: { slug: courseSlug, isPublished: true },
    select: { id: true },
  });
  if (!course) throw new QuizError("not-found", "Course not found");

  const modules = await prisma.module.findMany({
    where: { courseId: course.id, isPublished: true },
    select: { id: true, slug: true, order: true },
  });
  const quizModule = modules.find((m) => m.slug === FINAL_QUIZ_SLUG);
  if (!quizModule) throw new QuizError("not-found", "This course has no quiz");

  const completed = new Set(
    (
      await prisma.moduleProgress.findMany({
        where: {
          profileId,
          completedAt: { not: null },
          module: { courseId: course.id },
        },
        select: { moduleId: true },
      })
    ).map((p) => p.moduleId),
  );
  const outstanding = modules.filter(
    (m) => m.order < quizModule.order && !completed.has(m.id),
  );
  if (outstanding.length > 0) {
    throw new QuizError(
      "locked",
      "Complete every module before the final quiz",
    );
  }
  return { courseId: course.id, quizModuleId: quizModule.id };
}

type StoredQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
};

/** Questions by id, in the given order. Null if any no longer exists. */
async function loadQuestions(
  db: Pick<Prisma.TransactionClient, "quizQuestion">,
  ids: string[],
): Promise<StoredQuestion[] | null> {
  const rows = await db.quizQuestion.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      prompt: true,
      options: true,
      correctOptionId: true,
      explanation: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id));
  if (ordered.some((q) => !q)) return null;
  return ordered.map((q) => ({
    ...q!,
    options: OptionsSchema.parse(q!.options),
  }));
}

/** Options in the order stored on the attempt (new options go last). */
function orderOptions(options: QuizOption[], order: string[] | undefined) {
  if (!order) return options;
  const rank = (o: QuizOption) => {
    const index = order.indexOf(o.id);
    return index === -1 ? order.length : index;
  };
  return [...options].sort((a, b) => rank(a) - rank(b));
}

// ─── Starting ───────────────────────────────────────────────────────────────

export type StartedAttempt = {
  attemptId: string;
  questions: PublicQuizQuestion[];
};

/**
 * Starts the final quiz, or resumes an unsubmitted attempt from the last two
 * hours with the same questions in the same order. Answers never leave the
 * server: questions go through PublicQuizQuestionSchema.
 */
export async function startAttempt(
  courseSlug: string,
  random = Math.random,
): Promise<StartedAttempt> {
  const volunteer = await requireVolunteer();
  const { courseId } = await assertQuizUnlocked(volunteer.id, courseSlug);

  const open = await prisma.quizAttempt.findFirst({
    where: {
      profileId: volunteer.id,
      courseId,
      submittedAt: null,
      startedAt: { gte: new Date(Date.now() - RESUME_WINDOW_MS) },
    },
    orderBy: { startedAt: "desc" },
  });
  if (open) {
    const ids = QuestionIdsSchema.parse(open.questionIds);
    const questions =
      snapshotQuestions(open.questions, ids) ??
      (await loadQuestions(prisma, ids));
    // A question deleted since the attempt started: draw afresh instead.
    if (questions) {
      return toStarted(
        open.id,
        questions,
        OptionOrderSchema.parse(open.optionOrder),
      );
    }
  }

  const settings = await getSettings(prisma);
  const active = await prisma.quizQuestion.findMany({
    where: { courseId, isActive: true },
    select: { id: true, group: true, isRequired: true },
  });
  const drawn = drawQuestions(active, settings.questionsPerAttempt, random);
  if (drawn.length === 0) {
    throw new QuizError("unavailable", "The quiz has no questions yet");
  }

  const ids = drawn.map((q) => q.id);
  const questions = (await loadQuestions(prisma, ids))!;
  const optionOrder = Object.fromEntries(
    questions.map((q) => [q.id, shuffle(q.options, random).map((o) => o.id)]),
  );
  const attempt = await prisma.quizAttempt.create({
    data: {
      profileId: volunteer.id,
      courseId,
      questionIds: ids,
      // Frozen here, so edits in the admin area only reach new attempts.
      questions,
      optionOrder,
      total: ids.length,
    },
    select: { id: true },
  });
  return toStarted(attempt.id, questions, optionOrder);
}

function toStarted(
  attemptId: string,
  questions: StoredQuestion[],
  optionOrder: Record<string, string[]>,
): StartedAttempt {
  return {
    attemptId,
    questions: questions.map((q) =>
      PublicQuizQuestionSchema.parse({
        ...q,
        options: orderOptions(q.options, optionOrder[q.id]),
      }),
    ),
  };
}

// ─── Submitting ─────────────────────────────────────────────────────────────

export type QuestionResult = {
  questionId: string;
  prompt: string;
  options: QuizOption[];
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  explanation: string;
};

export type SubmittedAttempt = {
  attemptId: string;
  score: number;
  total: number;
  passMark: number;
  passed: boolean;
  results: QuestionResult[];
  /** Set when passed: the new certificate, or the one they already had. */
  certificateNumber: string | null;
};

/** Pass when score / total * 100 >= passMark (whole numbers, no rounding). */
export function hasPassed(score: number, total: number, passMark: number) {
  return total > 0 && score * 100 >= passMark * total;
}

/** "The correct answer is …" when the bank has no explanation. */
export function explain(explanation: string, correct: QuizOption | undefined) {
  if (explanation.trim()) return explanation;
  return correct
    ? `The correct answer is ${correct.text}.`
    : "No explanation is available.";
}

/**
 * Marks an attempt against the database. Every drawn question must be
 * answered with one of its options. Passing completes the Final Quiz module
 * and issues the certificate (or keeps the existing one) in the same
 * transaction. Retakes are unlimited: each is a new attempt.
 */
export async function submitAttempt(input: unknown): Promise<SubmittedAttempt> {
  const volunteer = await requireVolunteer();
  const parsed = QuizSubmissionSchema.safeParse(input);
  if (!parsed.success) throw new QuizError("invalid", "Invalid submission");
  const { attemptId, answers } = parsed.data;

  let courseId: string | null = null;
  const outcome = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
    });
    // Someone else's attempt looks the same as a missing one.
    if (!attempt || attempt.profileId !== volunteer.id) {
      throw new QuizError("not-found", "Quiz attempt not found");
    }
    if (attempt.submittedAt) {
      throw new QuizError(
        "already-submitted",
        "This attempt was already submitted",
      );
    }
    if (attempt.startedAt.getTime() < Date.now() - RESUME_WINDOW_MS) {
      throw new QuizError(
        "expired",
        "This attempt has expired; start a new one",
      );
    }

    const ids = QuestionIdsSchema.parse(attempt.questionIds);
    const chosen = new Map(answers.map((a) => [a.questionId, a.optionId]));
    if (chosen.size !== ids.length || ids.some((id) => !chosen.has(id))) {
      throw new QuizError("invalid", "Answer every question before submitting");
    }
    const questions =
      snapshotQuestions(attempt.questions, ids) ??
      (await loadQuestions(tx, ids));
    if (!questions) {
      throw new QuizError(
        "unavailable",
        "A question has been removed; start a new attempt",
      );
    }
    const optionOrder = OptionOrderSchema.parse(attempt.optionOrder);

    const results = questions.map((q) => {
      const selectedOptionId = chosen.get(q.id)!;
      if (!q.options.some((o) => o.id === selectedOptionId)) {
        throw new QuizError("invalid", "That answer isn't one of the options");
      }
      return toResult(q, selectedOptionId, optionOrder);
    });

    const { passMark } = await getSettings(tx);
    const score = results.filter((r) => r.correct).length;
    const total = results.length;
    const passed = hasPassed(score, total, passMark);

    // Guarded on submittedAt so two concurrent submits can't both count.
    const { count } = await tx.quizAttempt.updateMany({
      where: { id: attemptId, submittedAt: null },
      data: {
        answers: AnswersSchema.parse(Object.fromEntries(chosen)),
        score,
        total,
        passed,
        submittedAt: new Date(),
      },
    });
    if (count !== 1) {
      throw new QuizError(
        "already-submitted",
        "This attempt was already submitted",
      );
    }

    courseId = attempt.courseId;
    const certificateNumber = passed
      ? await completeCourse(tx, volunteer.id, attempt.courseId)
      : null;
    return {
      attemptId,
      score,
      total,
      passMark,
      passed,
      results,
      certificateNumber,
    };
  });

  // After the transaction commits, so the certificate exists to email about.
  if (outcome.passed && courseId) sendCompletionEmail(volunteer.id, courseId);
  return outcome;
}

function toResult(
  q: StoredQuestion,
  selectedOptionId: string,
  optionOrder: Record<string, string[]>,
): QuestionResult {
  const correctOption = q.options.find((o) => o.id === q.correctOptionId);
  return {
    questionId: q.id,
    prompt: q.prompt,
    options: orderOptions(q.options, optionOrder[q.id]),
    selectedOptionId,
    correctOptionId: q.correctOptionId,
    correct: selectedOptionId === q.correctOptionId,
    explanation: explain(q.explanation, correctOption),
  };
}

/**
 * Marks the Final Quiz module complete (keeping an earlier completion date)
 * and returns the volunteer's certificate number, issuing one if needed.
 */
async function completeCourse(
  tx: Prisma.TransactionClient,
  profileId: VolunteerId,
  courseId: string,
) {
  const quizModule = await tx.module.findFirst({
    where: { courseId, slug: FINAL_QUIZ_SLUG },
    select: { id: true },
  });
  if (quizModule) {
    const key = { profileId_moduleId: { profileId, moduleId: quizModule.id } };
    const progress = await tx.moduleProgress.findUnique({ where: key });
    if (!progress?.completedAt) {
      const completedAt = new Date();
      await tx.moduleProgress.upsert({
        where: key,
        create: { profileId, moduleId: quizModule.id, completedAt },
        update: { completedAt },
      });
    }
  }

  const existing = await tx.certificate.findUnique({
    where: { profileId_courseId: { profileId, courseId } },
    select: { certificateNumber: true },
  });
  if (existing) return existing.certificateNumber;

  const certificate = await tx.certificate.create({
    data: {
      profileId,
      courseId,
      certificateNumber: await nextCertificateNumber(tx),
    },
    select: { certificateNumber: true },
  });
  return certificate.certificateNumber;
}

// ─── Intro ──────────────────────────────────────────────────────────────────

export type QuizIntro = QuizSetting & {
  /** An unsubmitted attempt from the last two hours can be resumed. */
  hasOpenAttempt: boolean;
  /** Their latest passing attempt, marked, once they've passed. */
  passedAttempt: SubmittedAttempt | null;
};

/**
 * The volunteer's latest passing attempt with their answers, as the results
 * screen showed it, and their certificate number. Null if they haven't
 * passed.
 */
async function getPassedAttempt(
  profileId: VolunteerId,
  courseId: string,
  passMark: number,
): Promise<SubmittedAttempt | null> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { profileId, courseId, passed: true, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });
  if (!attempt) return null;
  const ids = QuestionIdsSchema.parse(attempt.questionIds);
  const answers = AnswersSchema.parse(attempt.answers);
  const optionOrder = OptionOrderSchema.parse(attempt.optionOrder);
  const questions =
    snapshotQuestions(attempt.questions, ids) ??
    (await loadQuestions(prisma, ids));
  const certificate = await prisma.certificate.findUnique({
    where: { profileId_courseId: { profileId, courseId } },
    select: { certificateNumber: true },
  });
  return {
    attemptId: attempt.id,
    score: attempt.score ?? 0,
    total: attempt.total,
    passMark,
    passed: true,
    // A question deleted since (older attempts only): show the score alone.
    results: (questions ?? []).map((q) =>
      toResult(q, answers[q.id] ?? "", optionOrder),
    ),
    certificateNumber: certificate?.certificateNumber ?? null,
  };
}

/** What the quiz intro screen shows. Reads only. */
export async function getQuizIntro(
  profileId: VolunteerId,
  courseId: string,
): Promise<QuizIntro> {
  const [settings, open] = await Promise.all([
    getSettings(prisma),
    prisma.quizAttempt.findFirst({
      where: {
        profileId,
        courseId,
        submittedAt: null,
        startedAt: { gte: new Date(Date.now() - RESUME_WINDOW_MS) },
      },
      select: { id: true },
    }),
  ]);
  return {
    ...settings,
    hasOpenAttempt: open !== null,
    passedAttempt: await getPassedAttempt(
      profileId,
      courseId,
      settings.passMark,
    ),
  };
}

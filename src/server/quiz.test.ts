import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerId } from "@/lib/auth";
import { loadQuestionBank, toQuestionData } from "../../prisma/quiz-import";
import { createFakePrisma, module, uuid } from "./__tests__/fake-prisma";

vi.mock("server-only", () => ({}));

// ─── Fake database: the shared fake plus the quiz tables ────────────────────

type Question = {
  id: string;
  courseId: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  group: string | null;
  isRequired: boolean;
  isActive: boolean;
};
type Attempt = {
  id: string;
  profileId: string;
  courseId: string;
  questionIds: string[];
  optionOrder: Record<string, string[]>;
  answers: Record<string, string>;
  score: number | null;
  total: number;
  passed: boolean;
  startedAt: Date;
  submittedAt: Date | null;
};
type Certificate = {
  profileId: string;
  courseId: string;
  certificateNumber: string;
};

const fake = createFakePrisma();
const quiz = {
  questions: [] as Question[],
  attempts: [] as Attempt[],
  certificates: [] as Certificate[],
  settings: { passMark: 80, questionsPerAttempt: 10 } as unknown,
};

const prisma = {
  ...fake.prisma,
  $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  course: {
    findFirst: async ({
      where,
    }: {
      where: { slug: string; isPublished: boolean };
    }) =>
      fake.db.courses.find(
        (c) => c.slug === where.slug && c.isPublished === where.isPublished,
      ) ?? null,
  },
  siteSetting: {
    findUnique: async () => ({ key: "quiz", value: quiz.settings }),
  },
  quizQuestion: {
    findMany: async ({
      where,
    }: {
      where: { courseId?: string; isActive?: boolean; id?: { in: string[] } };
    }) =>
      quiz.questions.filter(
        (q) =>
          (where.courseId === undefined || q.courseId === where.courseId) &&
          (where.isActive === undefined || q.isActive === where.isActive) &&
          (where.id === undefined || where.id.in.includes(q.id)),
      ),
  },
  quizAttempt: {
    findFirst: async ({
      where,
    }: {
      where: {
        profileId: string;
        courseId: string;
        submittedAt: null;
        startedAt: { gte: Date };
      };
    }) =>
      quiz.attempts
        .filter(
          (a) =>
            a.profileId === where.profileId &&
            a.courseId === where.courseId &&
            a.submittedAt === null &&
            a.startedAt >= where.startedAt.gte,
        )
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ??
      null,
    findUnique: async ({ where }: { where: { id: string } }) =>
      quiz.attempts.find((a) => a.id === where.id) ?? null,
    create: async ({
      data,
    }: {
      data: Pick<
        Attempt,
        "profileId" | "courseId" | "questionIds" | "optionOrder" | "total"
      >;
    }) => {
      const row: Attempt = {
        id: uuid(),
        answers: {},
        score: null,
        passed: false,
        startedAt: new Date(),
        submittedAt: null,
        ...structuredClone(data),
      };
      quiz.attempts.push(row);
      return { id: row.id };
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; submittedAt: null };
      data: Partial<Attempt>;
    }) => {
      const rows = quiz.attempts.filter(
        (a) => a.id === where.id && a.submittedAt === null,
      );
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
  },
  certificate: {
    findUnique: async ({
      where,
    }: {
      where: { profileId_courseId: { profileId: string; courseId: string } };
    }) =>
      quiz.certificates.find(
        (c) =>
          c.profileId === where.profileId_courseId.profileId &&
          c.courseId === where.profileId_courseId.courseId,
      ) ?? null,
    findFirst: async ({
      where,
    }: {
      where: { certificateNumber: { startsWith: string } };
    }) =>
      quiz.certificates
        .filter((c) =>
          c.certificateNumber.startsWith(where.certificateNumber.startsWith),
        )
        .sort((a, b) =>
          b.certificateNumber.localeCompare(a.certificateNumber),
        )[0] ?? null,
    create: async ({ data }: { data: Certificate }) => {
      quiz.certificates.push(data);
      return data;
    },
  },
};
vi.mock("@/lib/prisma", () => ({ prisma }));

let currentVolunteer = uuid() as VolunteerId;
vi.mock("@/lib/auth", () => ({
  requireVolunteer: async () => ({ id: currentVolunteer }),
}));

const {
  drawQuestions,
  explain,
  getQuizIntro,
  hasPassed,
  nextCertificateNumber,
  startAttempt,
  submitAttempt,
  RESUME_WINDOW_MS,
} = await import("./quiz");

// ─── Fixtures ───────────────────────────────────────────────────────────────

const SLUG = "volunteers-onboarding";
const courseId = uuid();
const alice = uuid() as VolunteerId;
const bob = uuid() as VolunteerId;
let welcome: ReturnType<typeof module>;
let safeguarding: ReturnType<typeof module>;
let finalQuiz: ReturnType<typeof module>;

/** The real bank's questions, so draws use its real groups. */
const bankQuestions = toQuestionData(
  loadQuestionBank("content/quizzes/volunteers-onboarding.json"),
);

function makeQuestions(): Question[] {
  return bankQuestions.map((q) => ({
    id: uuid(),
    courseId,
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    group: q.group,
    isRequired: false,
    isActive: true,
  }));
}

const complete = (profileId: string, moduleId: string) =>
  fake.db.progress.push({
    profileId,
    moduleId,
    lastBlockOrder: 0,
    checkPassed: false,
    completedAt: new Date(),
  });

beforeEach(() => {
  welcome = module(courseId, "welcome", 0);
  safeguarding = module(courseId, "safeguarding", 1);
  finalQuiz = module(courseId, "final-quiz", 2);
  fake.db.courses = [{ id: courseId, isPublished: true, slug: SLUG }];
  fake.db.modules = [welcome, safeguarding, finalQuiz];
  fake.db.progress = [];
  for (const profileId of [alice, bob]) {
    complete(profileId, welcome.id);
    complete(profileId, safeguarding.id);
  }
  quiz.questions = makeQuestions();
  quiz.attempts = [];
  quiz.certificates = [];
  quiz.settings = { passMark: 80, questionsPerAttempt: 10 };
  currentVolunteer = alice;
});

const byId = (id: string) => quiz.questions.find((q) => q.id === id)!;

/** Answers for an attempt, with the first `correct` answered correctly. */
function answersFor(attemptId: string, correct: number) {
  const attempt = quiz.attempts.find((a) => a.id === attemptId)!;
  return attempt.questionIds.map((questionId, index) => {
    const q = byId(questionId);
    const wrong = q.options.find((o) => o.id !== q.correctOptionId)!;
    return {
      questionId,
      optionId: index < correct ? q.correctOptionId : wrong.id,
    };
  });
}

// ─── Drawing ────────────────────────────────────────────────────────────────

describe("drawQuestions", () => {
  it("never draws two questions from one group across 500 draws", () => {
    const questions = makeQuestions();
    for (let i = 0; i < 500; i++) {
      const drawn = drawQuestions(questions, 10);
      expect(drawn).toHaveLength(10);
      const groups = drawn.flatMap((q) => q.group ?? []);
      expect(new Set(groups).size).toBe(groups.length);
      expect(new Set(drawn.map((q) => q.id)).size).toBe(10);
    }
  });

  it("always includes required questions, and nothing else from their group", () => {
    const questions = makeQuestions();
    const grouped = questions.find((q) => q.group)!;
    grouped.isRequired = true;
    const ungrouped = questions.find((q) => !q.group)!;
    ungrouped.isRequired = true;
    for (let i = 0; i < 500; i++) {
      const drawn = drawQuestions(questions, 10);
      expect(drawn).toHaveLength(10);
      expect(drawn).toContain(grouped);
      expect(drawn).toContain(ungrouped);
      expect(drawn.filter((q) => q.group === grouped.group)).toEqual([grouped]);
    }
  });

  it("uses every unit when there are just enough", () => {
    const q = (id: string, group: string | null) => ({
      id,
      group,
      isRequired: false,
    });
    const questions = [q("1", "a"), q("2", "a"), q("3", null), q("4", "b")];
    for (let i = 0; i < 50; i++) {
      const drawn = drawQuestions(questions, 3);
      expect(drawn).toHaveLength(3);
      expect(drawn.map((d) => d.id)).toContain("3");
      expect(drawn.map((d) => d.id)).toContain("4");
    }
  });
});

// ─── Starting ───────────────────────────────────────────────────────────────

describe("startAttempt", () => {
  it("is locked until every module before the quiz is complete", async () => {
    fake.db.progress = fake.db.progress.filter(
      (p) => p.moduleId !== safeguarding.id || p.profileId !== alice,
    );
    await expect(startAttempt(SLUG)).rejects.toMatchObject({ code: "locked" });
    expect(quiz.attempts).toHaveLength(0);

    complete(alice, safeguarding.id);
    await expect(startAttempt(SLUG)).resolves.toBeDefined();
  });

  it("ignores unpublished modules when checking the lock", async () => {
    fake.db.modules.push(module(courseId, "draft", 1, { isPublished: false }));
    await expect(startAttempt(SLUG)).resolves.toBeDefined();
  });

  it("never sends answers, explanations or groups", async () => {
    for (const q of quiz.questions) q.explanation = "Secret explanation";
    const { questions } = await startAttempt(SLUG);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      expect(Object.keys(q).sort()).toEqual(["id", "options", "prompt"]);
      for (const o of q.options) {
        expect(Object.keys(o).sort()).toEqual(["id", "text"]);
      }
    }
    const json = JSON.stringify(questions);
    expect(json).not.toContain("correctOptionId");
    expect(json).not.toContain("Secret explanation");
    expect(json).not.toContain('"group"');
  });

  it("only draws active questions", async () => {
    const inactive = new Set(
      quiz.questions.slice(0, 50).map((q) => {
        q.isActive = false;
        return q.id;
      }),
    );
    const { questions } = await startAttempt(SLUG);
    expect(questions.some((q) => inactive.has(q.id))).toBe(false);
  });

  it("resumes an unsubmitted attempt with the same questions and order", async () => {
    const first = await startAttempt(SLUG);
    const second = await startAttempt(SLUG);
    expect(second).toEqual(first);
    expect(quiz.attempts).toHaveLength(1);
  });

  it("stores and replays a shuffled option order", async () => {
    // With random() always 0, a shuffle of a, b, c, d gives b, c, d, a.
    const { attemptId, questions } = await startAttempt(SLUG, () => 0);
    const stored = quiz.attempts.find((a) => a.id === attemptId)!;
    for (const q of questions) {
      expect(q.options.map((o) => o.id)).toEqual(stored.optionOrder[q.id]);
      expect(q.options.map((o) => o.id)).toEqual(["b", "c", "d", "a"]);
    }
    expect((await startAttempt(SLUG)).questions).toEqual(questions);
  });

  it("draws afresh after two hours", async () => {
    const first = await startAttempt(SLUG);
    quiz.attempts[0].startedAt = new Date(Date.now() - RESUME_WINDOW_MS - 1);
    const second = await startAttempt(SLUG);
    expect(second.attemptId).not.toBe(first.attemptId);
  });

  it("doesn't resume another volunteer's attempt", async () => {
    const mine = await startAttempt(SLUG);
    currentVolunteer = bob;
    const theirs = await startAttempt(SLUG);
    expect(theirs.attemptId).not.toBe(mine.attemptId);
  });
});

// ─── Submitting ─────────────────────────────────────────────────────────────

describe("submitAttempt", () => {
  it("passes 8 out of 10 at an 80% pass mark, and fails 7", async () => {
    expect(hasPassed(8, 10, 80)).toBe(true);
    expect(hasPassed(7, 10, 80)).toBe(false);
    expect(hasPassed(10, 10, 100)).toBe(true);
    expect(hasPassed(0, 0, 0)).toBe(false);

    const failing = await startAttempt(SLUG);
    const failed = await submitAttempt({
      attemptId: failing.attemptId,
      answers: answersFor(failing.attemptId, 7),
    });
    expect(failed).toMatchObject({ score: 7, total: 10, passed: false });
    expect(failed.certificateNumber).toBeNull();

    const passing = await startAttempt(SLUG);
    expect(passing.attemptId).not.toBe(failing.attemptId);
    const passed = await submitAttempt({
      attemptId: passing.attemptId,
      answers: answersFor(passing.attemptId, 8),
    });
    expect(passed).toMatchObject({ score: 8, total: 10, passed: true });
    expect(quiz.attempts.find((a) => a.id === passing.attemptId)).toMatchObject(
      { score: 8, passed: true, submittedAt: expect.any(Date) },
    );
  });

  it("returns each question's result with an explanation", async () => {
    const { attemptId } = await startAttempt(SLUG);
    const first = byId(quiz.attempts[0].questionIds[0]);
    first.explanation = "Because the deck says so.";
    const second = byId(quiz.attempts[0].questionIds[1]);
    second.explanation = "";

    const { results } = await submitAttempt({
      attemptId,
      answers: answersFor(attemptId, 1),
    });
    expect(results[0]).toMatchObject({
      questionId: first.id,
      prompt: first.prompt,
      selectedOptionId: first.correctOptionId,
      correctOptionId: first.correctOptionId,
      correct: true,
      explanation: "Because the deck says so.",
    });
    const correctText = second.options.find(
      (o) => o.id === second.correctOptionId,
    )!.text;
    expect(results[1]).toMatchObject({
      correct: false,
      explanation: `The correct answer is ${correctText}.`,
    });
  });

  it("cannot be submitted twice", async () => {
    const { attemptId } = await startAttempt(SLUG);
    const answers = answersFor(attemptId, 10);
    await submitAttempt({ attemptId, answers });
    await expect(submitAttempt({ attemptId, answers })).rejects.toMatchObject({
      code: "already-submitted",
    });
    expect(quiz.certificates).toHaveLength(1);
  });

  it("cannot submit another volunteer's attempt", async () => {
    const { attemptId } = await startAttempt(SLUG);
    currentVolunteer = bob;
    await expect(
      submitAttempt({ attemptId, answers: answersFor(attemptId, 10) }),
    ).rejects.toMatchObject({ code: "not-found" });
    expect(quiz.attempts[0].submittedAt).toBeNull();
  });

  it("requires every drawn question to be answered", async () => {
    const { attemptId } = await startAttempt(SLUG);
    const answers = answersFor(attemptId, 10);
    await expect(
      submitAttempt({ attemptId, answers: answers.slice(1) }),
    ).rejects.toMatchObject({ code: "invalid" });

    const other = quiz.questions.find(
      (q) => !quiz.attempts[0].questionIds.includes(q.id),
    )!;
    await expect(
      submitAttempt({
        attemptId,
        answers: [...answers.slice(1), { questionId: other.id, optionId: "a" }],
      }),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(quiz.attempts[0].submittedAt).toBeNull();
  });

  it("rejects an option that isn't on the question", async () => {
    const { attemptId } = await startAttempt(SLUG);
    const answers = answersFor(attemptId, 10);
    answers[0].optionId = "zzz";
    await expect(submitAttempt({ attemptId, answers })).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("rejects a malformed submission", async () => {
    await expect(
      submitAttempt({ attemptId: "nope", answers: [] }),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("completes the Final Quiz module and issues one certificate", async () => {
    const first = await startAttempt(SLUG);
    const result = await submitAttempt({
      attemptId: first.attemptId,
      answers: answersFor(first.attemptId, 10),
    });
    const year = new Date().getUTCFullYear();
    expect(result.certificateNumber).toBe(`KC-${year}-000001`);
    const progress = fake.db.progress.find(
      (p) => p.profileId === alice && p.moduleId === finalQuiz.id,
    );
    expect(progress?.completedAt).toBeInstanceOf(Date);
    const completedAt = progress!.completedAt;

    // A retake is a fresh attempt; passing again keeps the same certificate.
    const retake = await startAttempt(SLUG);
    expect(retake.attemptId).not.toBe(first.attemptId);
    const again = await submitAttempt({
      attemptId: retake.attemptId,
      answers: answersFor(retake.attemptId, 10),
    });
    expect(again.certificateNumber).toBe(result.certificateNumber);
    expect(quiz.certificates).toHaveLength(1);
    expect(progress!.completedAt).toBe(completedAt);
  });

  it("doesn't complete the module or issue a certificate on a fail", async () => {
    const { attemptId } = await startAttempt(SLUG);
    await submitAttempt({ attemptId, answers: answersFor(attemptId, 0) });
    expect(fake.db.progress.some((p) => p.moduleId === finalQuiz.id)).toBe(
      false,
    );
    expect(quiz.certificates).toHaveLength(0);
  });
});

describe("getQuizIntro", () => {
  it("returns the settings and whether there's an attempt to resume", async () => {
    quiz.settings = { passMark: 70, questionsPerAttempt: 12 };
    expect(await getQuizIntro(alice, courseId)).toEqual({
      passMark: 70,
      questionsPerAttempt: 12,
      hasOpenAttempt: false,
    });
    await startAttempt(SLUG);
    expect((await getQuizIntro(alice, courseId)).hasOpenAttempt).toBe(true);
    expect((await getQuizIntro(bob, courseId)).hasOpenAttempt).toBe(false);
  });
});

describe("helpers", () => {
  it("numbers certificates within the year", async () => {
    const tx = prisma as unknown as Parameters<typeof nextCertificateNumber>[0];
    const now = new Date("2026-06-01T00:00:00Z");
    expect(await nextCertificateNumber(tx, now)).toBe("KC-2026-000001");
    quiz.certificates.push(
      { profileId: alice, courseId, certificateNumber: "KC-2026-000041" },
      { profileId: bob, courseId, certificateNumber: "KC-2025-000099" },
    );
    expect(await nextCertificateNumber(tx, now)).toBe("KC-2026-000042");
  });

  it("falls back to the correct answer when there's no explanation", () => {
    expect(explain("", { id: "a", text: "Kingdom Culture" })).toBe(
      "The correct answer is Kingdom Culture.",
    );
    expect(explain("Given.", { id: "a", text: "x" })).toBe("Given.");
  });
});

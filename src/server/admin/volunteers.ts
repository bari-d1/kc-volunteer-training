import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import type { VolunteerId } from "@/lib/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import { QuizOptionSchema } from "@/lib/schemas/quiz";
import {
  matchesFilters,
  volunteerStatus,
  type VolunteerFilters,
  type VolunteerStatus,
} from "@/lib/volunteer-status";
import { deleteAccount } from "../account";
import { logChange } from "./change-log";

export type VolunteerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchInterest: string | null;
  teamInterest: string | null;
  status: VolunteerStatus;
  completedModules: number;
  totalModules: number;
  /** Highest submitted score, e.g. { score: 8, total: 10 }. */
  bestScore: { score: number; total: number } | null;
  createdAt: Date;
  /** Latest progress or quiz submission, else the sign-up date. */
  lastActive: Date;
};

async function defaultCourse() {
  return prisma.course.findUnique({
    where: { slug: DEFAULT_COURSE_SLUG },
    select: {
      id: true,
      _count: { select: { modules: { where: { isPublished: true } } } },
    },
  });
}

/**
 * One row per volunteer with their status, best score and last activity,
 * from a few grouped queries (not one per volunteer), then filtered.
 */
export async function listVolunteerRows(
  filters: VolunteerFilters = {},
  now = new Date(),
): Promise<VolunteerRow[]> {
  await requireAdmin();
  const course = await defaultCourse();
  const courseId = course?.id ?? "";

  const [profiles, completions, activity, attempts, bestScores] =
    await Promise.all([
      prisma.profile.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          branchInterest: true,
          teamInterest: true,
          createdAt: true,
          _count: { select: { certificates: { where: { courseId } } } },
        },
      }),
      prisma.moduleProgress.groupBy({
        by: ["profileId"],
        where: { completedAt: { not: null }, module: { courseId } },
        _count: { _all: true },
      }),
      prisma.moduleProgress.groupBy({
        by: ["profileId"],
        where: { module: { courseId } },
        _max: { updatedAt: true },
      }),
      prisma.quizAttempt.groupBy({
        by: ["profileId"],
        where: { courseId, submittedAt: { not: null } },
        _count: { _all: true },
        _max: { submittedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: { courseId, submittedAt: { not: null } },
        distinct: ["profileId"],
        orderBy: [{ profileId: "asc" }, { score: "desc" }],
        select: { profileId: true, score: true, total: true },
      }),
    ]);

  const completed = new Map(
    completions.map((c) => [c.profileId, c._count._all]),
  );
  const progressAt = new Map(
    activity.map((a) => [a.profileId, a._max.updatedAt]),
  );
  const attemptStats = new Map(attempts.map((a) => [a.profileId, a]));
  const best = new Map(bestScores.map((b) => [b.profileId, b]));

  return profiles
    .map((p): VolunteerRow => {
      const attempt = attemptStats.get(p.id);
      const top = best.get(p.id);
      const completedModules = completed.get(p.id) ?? 0;
      const times = [
        p.createdAt,
        progressAt.get(p.id),
        attempt?._max.submittedAt,
      ].filter((d): d is Date => d instanceof Date);
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        branchInterest: p.branchInterest,
        teamInterest: p.teamInterest,
        status: volunteerStatus({
          hasCertificate: p._count.certificates > 0,
          submittedAttempts: attempt?._count._all ?? 0,
          completedModules,
        }),
        completedModules,
        totalModules: course?._count.modules ?? 0,
        bestScore:
          top && top.score != null
            ? { score: top.score, total: top.total }
            : null,
        createdAt: p.createdAt,
        lastActive: new Date(Math.max(...times.map((t) => t.getTime()))),
      };
    })
    .filter((row) => matchesFilters(row, filters, now));
}

const AnswersSchema = z.record(z.string(), z.string());
const IdsSchema = z.array(z.string());
const OptionsSchema = z.array(QuizOptionSchema);

/** Everything about one volunteer for the admin detail page, or null. */
export async function getVolunteerDetail(id: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return null;
  const course = await defaultCourse();
  const courseId = course?.id ?? "";

  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      branchInterest: true,
      teamInterest: true,
      consentAt: true,
      createdAt: true,
      emailReminders: true,
      hideNarrator: true,
    },
  });
  if (!profile) return null;

  const [modules, progress, attempts, certificate, emails] = await Promise.all([
    prisma.module.findMany({
      where: { courseId, isPublished: true },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
    prisma.moduleProgress.findMany({
      where: { profileId: id, module: { courseId } },
      select: {
        moduleId: true,
        completedAt: true,
        checkPassed: true,
        updatedAt: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: { profileId: id, courseId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        total: true,
        passed: true,
        questionIds: true,
        answers: true,
      },
    }),
    prisma.certificate.findUnique({
      where: { profileId_courseId: { profileId: id, courseId } },
      select: { certificateNumber: true, issuedAt: true },
    }),
    prisma.emailLog.findMany({
      where: { profileId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        template: true,
        status: true,
        error: true,
        createdAt: true,
      },
    }),
  ]);

  // Every question any attempt asked, in one query.
  const questionIds = [
    ...new Set(attempts.flatMap((a) => IdsSchema.parse(a.questionIds))),
  ];
  const questions = new Map(
    (
      await prisma.quizQuestion.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          prompt: true,
          options: true,
          correctOptionId: true,
        },
      })
    ).map((q) => [q.id, { ...q, options: OptionsSchema.parse(q.options) }]),
  );

  const byModule = new Map(progress.map((p) => [p.moduleId, p]));
  return {
    profile,
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      completedAt: byModule.get(m.id)?.completedAt ?? null,
      started: byModule.has(m.id),
    })),
    attempts: attempts.map((a) => {
      const answers = AnswersSchema.parse(a.answers);
      return {
        id: a.id,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score: a.score,
        total: a.total,
        passed: a.passed,
        answers: IdsSchema.parse(a.questionIds).map((questionId) => {
          const q = questions.get(questionId);
          const chosen = answers[questionId];
          const text = (optionId?: string) =>
            q?.options.find((o) => o.id === optionId)?.text ?? null;
          return {
            questionId,
            prompt: q?.prompt ?? "(question deleted)",
            answer: text(chosen),
            correctAnswer: text(q?.correctOptionId),
            correct: q ? chosen === q.correctOptionId : false,
          };
        }),
      };
    }),
    certificate,
    emails,
  };
}

export type VolunteerDetail = NonNullable<
  Awaited<ReturnType<typeof getVolunteerDetail>>
>;

/**
 * Deletes the volunteer's unsubmitted quiz attempts (an attempt they've
 * abandoned or got stuck in). Submitted attempts are history and stay.
 */
export async function resetQuizAttempts(profileId: string) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.quizAttempt.deleteMany({
      where: { profileId, submittedAt: null },
    });
    await logChange(
      tx,
      "Profile",
      profileId,
      "update",
      `Reset quiz attempts (${count} unsubmitted deleted)`,
    );
    return count;
  });
}

/**
 * Clears the volunteer's module progress so they start the training again.
 * Their quiz history, certificate and reflection answers stay.
 */
export async function resetModuleProgress(profileId: string) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.moduleProgress.deleteMany({
      where: { profileId },
    });
    await logChange(
      tx,
      "Profile",
      profileId,
      "update",
      `Reset module progress (${count} module${count === 1 ? "" : "s"})`,
    );
    return count;
  });
}

/**
 * Deletes the volunteer exactly as their own account deletion does: their
 * profile and training data, then their Supabase sign-in. The change log
 * keeps only the id, not their name.
 */
export async function deleteVolunteer(profileId: string) {
  await requireAdmin();
  const result = await deleteAccount(profileId as VolunteerId);
  await prisma.contentChange.create({
    data: {
      entity: "Profile",
      entityId: profileId,
      action: "delete",
      summary: result.authUserDeleted
        ? "Deleted a volunteer and their sign-in"
        : "Deleted a volunteer (their sign-in couldn't be removed; delete it in Supabase)",
    },
  });
  return result;
}

export async function listRecentChanges(limit = 50) {
  await requireAdmin();
  return prisma.contentChange.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

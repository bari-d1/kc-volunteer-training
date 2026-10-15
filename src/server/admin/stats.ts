import "server-only";
import type { BranchCode } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import { weekStart } from "@/lib/weeks";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Courses for the Overview filter. */
export async function listStatsCourses() {
  await requireAdmin();
  return prisma.course.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true },
  });
}

/** The course to report on: the slug asked for, else the default course. */
export async function getStatsCourse(slug?: string) {
  await requireAdmin();
  return (
    (slug &&
      (await prisma.course.findUnique({
        where: { slug },
        select: { id: true, slug: true, title: true },
      }))) ||
    prisma.course.findUnique({
      where: { slug: DEFAULT_COURSE_SLUG },
      select: { id: true, slug: true, title: true },
    })
  );
}

// ─── Headline numbers ───────────────────────────────────────────────────────

type Snapshot = {
  signedUp: number;
  inProgress: number;
  completed: number;
  /** Completed ÷ signed up, as a percentage; null with nobody signed up. */
  completionRate: number | null;
  /** Of volunteers who've taken the quiz, % who passed their first try. */
  firstAttemptPassRate: number | null;
  /** Average attempts up to and including the first pass. */
  averageAttemptsToPass: number | null;
};

const percent = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((part / whole) * 100);

/** The headline numbers as they stood at `at`. */
async function snapshot(courseId: string, at: Date): Promise<Snapshot> {
  const [signedUp, started, completed, firstAttempts, attemptsToPass] =
    await Promise.all([
      prisma.profile.count({ where: { createdAt: { lte: at } } }),
      prisma.profile.count({
        where: {
          moduleProgress: {
            some: { createdAt: { lte: at }, module: { courseId } },
          },
        },
      }),
      prisma.certificate.count({
        where: { courseId, issuedAt: { lte: at } },
      }),
      // Each volunteer's first submitted attempt.
      prisma.$queryRaw<Array<{ takers: bigint; passed: bigint }>>`
        SELECT count(*) AS takers,
               count(*) FILTER (WHERE first.passed) AS passed
        FROM (
          SELECT DISTINCT ON ("profileId") passed
          FROM "QuizAttempt"
          WHERE "courseId" = ${courseId}::uuid
            AND "submittedAt" IS NOT NULL
            AND "submittedAt" <= ${at}
          ORDER BY "profileId", "submittedAt"
        ) AS first`,
      // Attempts each volunteer needed, up to their first pass.
      prisma.$queryRaw<Array<{ average: number | null }>>`
        SELECT avg(tries)::float AS average
        FROM (
          SELECT count(*) AS tries
          FROM "QuizAttempt" a
          JOIN (
            SELECT "profileId", min("submittedAt") AS passed_at
            FROM "QuizAttempt"
            WHERE "courseId" = ${courseId}::uuid
              AND passed
              AND "submittedAt" <= ${at}
            GROUP BY "profileId"
          ) p ON p."profileId" = a."profileId"
          WHERE a."courseId" = ${courseId}::uuid
            AND a."submittedAt" IS NOT NULL
            AND a."submittedAt" <= p.passed_at
          GROUP BY a."profileId"
        ) AS per_volunteer`,
    ]);

  const takers = Number(firstAttempts[0]?.takers ?? 0);
  const passedFirst = Number(firstAttempts[0]?.passed ?? 0);
  const average = attemptsToPass[0]?.average;
  return {
    signedUp,
    // Everyone who finished has progress, so this never double counts.
    inProgress: started - completed,
    completed,
    completionRate: percent(completed, signedUp),
    firstAttemptPassRate: percent(passedFirst, takers),
    averageAttemptsToPass:
      average == null ? null : Math.round(average * 10) / 10,
  };
}

export type HeadlineStat = {
  value: number | null;
  /** value minus the value 7 days ago (null if either is null). */
  change: number | null;
};

/** Each headline number now, with how much it moved in the last 7 days. */
export async function getHeadlineStats(courseId: string, now = new Date()) {
  await requireAdmin();
  const [current, weekAgo] = await Promise.all([
    snapshot(courseId, now),
    snapshot(courseId, new Date(now.getTime() - WEEK_MS)),
  ]);
  const stats = {} as Record<keyof Snapshot, HeadlineStat>;
  for (const key of Object.keys(current) as Array<keyof Snapshot>) {
    const value = current[key];
    const before = weekAgo[key];
    stats[key] = {
      value,
      change:
        value == null || before == null
          ? null
          : Math.round((value - before) * 10) / 10,
    };
  }
  return stats;
}

// ─── Charts ─────────────────────────────────────────────────────────────────

/**
 * "Where volunteers stop": how many have completed each module, in course
 * order, after the number who signed up.
 */
export async function getModuleFunnel(courseId: string) {
  await requireAdmin();
  const [modules, completions, signedUp] = await Promise.all([
    prisma.module.findMany({
      where: { courseId, isPublished: true },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
    prisma.moduleProgress.groupBy({
      by: ["moduleId"],
      where: { completedAt: { not: null }, module: { courseId } },
      _count: { _all: true },
    }),
    prisma.profile.count(),
  ]);
  const counts = new Map(completions.map((c) => [c.moduleId, c._count._all]));
  return [
    { label: "Signed up", count: signedUp },
    ...modules.map((m, index) => ({
      label: `${index + 1}. ${m.title}`,
      count: counts.get(m.id) ?? 0,
    })),
  ];
}

/** Sign-ups per week (Monday to Sunday, UTC) for the last `weeks` weeks. */
export async function getWeeklySignups(weeks = 12, now = new Date()) {
  await requireAdmin();
  const thisWeek = weekStart(now);
  const from = new Date(thisWeek.getTime() - (weeks - 1) * WEEK_MS);
  const rows = await prisma.$queryRaw<Array<{ week: Date; count: bigint }>>`
    -- createdAt is stored as UTC, so this is Monday 00:00 UTC.
    SELECT date_trunc('week', "createdAt") AS week,
           count(*) AS count
    FROM "Profile"
    WHERE "createdAt" >= ${from}
    GROUP BY 1`;
  const byWeek = new Map(
    rows.map((r) => [new Date(r.week).getTime(), Number(r.count)]),
  );
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(from.getTime() + i * WEEK_MS);
    return { weekStart: start, count: byWeek.get(start.getTime()) ?? 0 };
  });
}

const BRANCHES: Array<{ code: BranchCode | null; label: string }> = [
  { code: "EXPERIENCE", label: "Experience" },
  { code: "MINISTRY", label: "Ministry" },
  { code: "CREATIVE", label: "Creative" },
  { code: "SYSTEMS", label: "Systems" },
  { code: null, label: "Not sure yet" },
];

/** Volunteers by the branch they chose at onboarding. */
export async function getBranchBreakdown() {
  await requireAdmin();
  const groups = await prisma.profile.groupBy({
    by: ["branchInterest"],
    _count: { _all: true },
  });
  const counts = new Map(groups.map((g) => [g.branchInterest, g._count._all]));
  return BRANCHES.map(({ code, label }) => ({
    code,
    label,
    count: counts.get(code) ?? 0,
  }));
}

export type RecentActivity = {
  kind: "signed-up" | "completed";
  name: string;
  at: Date;
};

/** The latest sign-ups and course completions, newest first. */
export async function getRecentActivity(
  courseId: string,
  limit = 10,
): Promise<RecentActivity[]> {
  await requireAdmin();
  const [signUps, completions] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { firstName: true, lastName: true, createdAt: true },
    }),
    prisma.certificate.findMany({
      where: { courseId },
      orderBy: { issuedAt: "desc" },
      take: limit,
      select: {
        issuedAt: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return [
    ...signUps.map((p) => ({
      kind: "signed-up" as const,
      name: `${p.firstName} ${p.lastName}`,
      at: p.createdAt,
    })),
    ...completions.map((c) => ({
      kind: "completed" as const,
      name: `${c.profile.firstName} ${c.profile.lastName}`,
      at: c.issuedAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

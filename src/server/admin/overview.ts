import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Headline numbers for the admin overview. */
export async function getOverviewStats(now = new Date()) {
  await requireAdmin();
  const [volunteers, newThisWeek, completed, started, attempts, passed] =
    await Promise.all([
      prisma.profile.count(),
      prisma.profile.count({
        where: { createdAt: { gte: new Date(now.getTime() - WEEK_MS) } },
      }),
      prisma.profile.count({ where: { certificates: { some: {} } } }),
      prisma.profile.count({
        where: {
          certificates: { none: {} },
          moduleProgress: { some: {} },
        },
      }),
      prisma.quizAttempt.count({ where: { submittedAt: { not: null } } }),
      prisma.quizAttempt.count({ where: { passed: true } }),
    ]);
  return {
    volunteers,
    newThisWeek,
    completed,
    inProgress: started,
    notStarted: volunteers - completed - started,
    quizAttempts: attempts,
    passRate: attempts === 0 ? null : Math.round((passed / attempts) * 100),
  };
}

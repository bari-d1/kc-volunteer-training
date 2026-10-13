import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/** Volunteers with how many modules they've completed and their certificates. */
export async function listVolunteers() {
  await requireAdmin();
  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      branchInterest: true,
      teamInterest: true,
      createdAt: true,
      _count: {
        select: {
          moduleProgress: { where: { completedAt: { not: null } } },
          certificates: true,
        },
      },
    },
  });
  return profiles.map(({ _count, ...profile }) => ({
    ...profile,
    modulesCompleted: _count.moduleProgress,
    certificates: _count.certificates,
  }));
}

export async function listRecentChanges(limit = 50) {
  await requireAdmin();
  return prisma.contentChange.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

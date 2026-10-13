import "server-only";
import type { BranchCode } from "@/generated/prisma/client";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

/** The volunteer's profile, plus the id of their current team for the edit form. */
export async function getAccount(profileId: VolunteerId) {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
  });
  // teamInterest stores the team's name; find it again for the dropdown.
  const team =
    profile.branchInterest && profile.teamInterest
      ? await prisma.team.findFirst({
          where: {
            name: profile.teamInterest,
            isActive: true,
            branch: { code: profile.branchInterest },
          },
          select: { id: true },
        })
      : null;
  return { profile, teamId: team?.id ?? "" };
}

export async function updateAccountDetails(
  profileId: VolunteerId,
  details: {
    firstName: string;
    lastName: string;
    branchInterest: BranchCode | null;
    teamInterest: string | null;
  },
) {
  return prisma.profile.update({ where: { id: profileId }, data: details });
}

/**
 * Everything we hold about the volunteer, for a subject access request:
 * profile, module progress, quiz attempts and certificates.
 */
export async function exportAccountData(profileId: VolunteerId) {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      moduleProgress: {
        orderBy: { createdAt: "asc" },
        include: {
          module: {
            select: { title: true, course: { select: { title: true } } },
          },
        },
      },
      quizAttempts: {
        orderBy: { submittedAt: "asc" },
        include: { course: { select: { title: true } } },
      },
      certificates: {
        orderBy: { issuedAt: "asc" },
        include: { course: { select: { title: true } } },
      },
    },
  });

  const { moduleProgress, quizAttempts, certificates, ...details } = profile;
  return {
    exportedAt: new Date().toISOString(),
    profile: details,
    moduleProgress: moduleProgress.map(({ module, ...row }) => ({
      ...row,
      course: module.course.title,
      module: module.title,
    })),
    quizAttempts: quizAttempts.map(({ course, ...row }) => ({
      ...row,
      course: course.title,
    })),
    certificates: certificates.map(({ course, ...row }) => ({
      ...row,
      course: course.title,
    })),
  };
}

/**
 * Deletes the volunteer's Profile (cascading to progress, quiz attempts and
 * certificates), then their Supabase auth user. Training data goes first so
 * it's removed even if the auth deletion fails.
 */
export async function deleteAccount(profileId: VolunteerId) {
  await prisma.profile.delete({ where: { id: profileId } });

  try {
    const { error } =
      await createAdminClient().auth.admin.deleteUser(profileId);
    if (error) throw error;
    return { authUserDeleted: true as const };
  } catch (error) {
    console.error("Supabase auth user deletion failed", profileId, error);
    return { authUserDeleted: false as const };
  }
}

import "server-only";
import { Prisma, type BranchCode } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function hasProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return profile !== null;
}

/** Branch names/descriptions and active teams for the onboarding form. */
export async function getOnboardingOptions() {
  const [branches, teams] = await Promise.all([
    prisma.branch.findMany({
      select: { code: true, name: true, description: true },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, branch: { select: { code: true } } },
    }),
  ]);
  return {
    branches,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      branch: t.branch.code,
    })),
  };
}

/** The team's name if it's active and belongs to the branch, else null. */
export async function findActiveTeamName(teamId: string, branch: BranchCode) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, isActive: true, branch: { code: branch } },
    select: { name: true },
  });
  return team?.name ?? null;
}

/**
 * Creates the signed-in user's Profile (id = Supabase user id). The user
 * comes from getCurrentUser(), never from form input.
 */
export async function createProfile(
  user: CurrentUser,
  details: {
    firstName: string;
    lastName: string;
    branchInterest: BranchCode | null;
    teamInterest: string | null;
  },
): Promise<"created" | "exists" | "email-taken"> {
  try {
    await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email,
        ...details,
        consentAt: new Date(),
      },
    });
    return "created";
  } catch (error) {
    const duplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!duplicate) throw error;
    // Same id: a double submit. Otherwise the email belongs to someone else.
    return (await hasProfile(user.id)) ? "exists" : "email-taken";
  }
}

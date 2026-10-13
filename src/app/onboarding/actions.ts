"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  NOT_SURE,
  OnboardingSchema,
  type OnboardingField,
} from "@/lib/schemas/onboarding";

export type OnboardingValues = {
  firstName: string;
  lastName: string;
  branchInterest: string;
  teamId: string;
  consent: boolean;
};

export type OnboardingState =
  | { status: "idle" }
  | {
      status: "error";
      values: OnboardingValues;
      errors: Partial<Record<OnboardingField, string>>;
      /** Problem not tied to one field. */
      formError?: string;
    };

/** Creates the volunteer's Profile, then sends them to the course. */
export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/onboarding");

  const raw = {
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    branchInterest: formData.get("branchInterest") ?? undefined,
    teamId: formData.get("teamId") ?? undefined,
    consent: formData.get("consent") ?? undefined,
  };
  const values: OnboardingValues = {
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    branchInterest: String(raw.branchInterest ?? ""),
    teamId: String(raw.teamId ?? ""),
    consent: raw.consent === "on",
  };
  const fail = (
    errors: Partial<Record<OnboardingField, string>>,
    formError?: string,
  ): OnboardingState => ({ status: "error", values, errors, formError });

  const parsed = OnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Partial<Record<OnboardingField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as OnboardingField;
      errors[field] ??= issue.message;
    }
    return fail(errors);
  }
  const { firstName, lastName, branchInterest, teamId } = parsed.data;
  const branch = branchInterest === NOT_SURE ? null : branchInterest;

  // Store the team's name; it must be active and in the chosen branch.
  let teamInterest: string | null = null;
  if (teamId && branch) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, isActive: true, branch: { code: branch } },
      select: { name: true },
    });
    if (!team) {
      return fail({
        teamId: "That team isn't available. Pick another or leave it blank.",
      });
    }
    teamInterest = team.name;
  }

  if (!user.email) {
    return fail(
      {},
      "Your account doesn't have an email address. Please sign in again.",
    );
  }

  try {
    await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email,
        firstName,
        lastName,
        branchInterest: branch,
        teamInterest,
        consentAt: new Date(),
      },
    });
  } catch (error) {
    const duplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!duplicate) {
      console.error("Profile create failed", error);
      return fail({}, "We couldn't save your details. Please try again.");
    }
    // Double submit: the profile already exists, so carry on.
    const existing = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!existing) {
      return fail(
        {},
        "This email is already linked to another volunteer profile. Please contact the KC team.",
      );
    }
  }

  redirect("/course");
}

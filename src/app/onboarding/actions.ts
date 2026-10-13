"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  NOT_SURE,
  OnboardingSchema,
  type OnboardingField,
} from "@/lib/schemas/onboarding";
import { createProfile, findActiveTeamName } from "@/server/profiles";

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
    teamInterest = await findActiveTeamName(teamId, branch);
    if (!teamInterest) {
      return fail({
        teamId: "That team isn't available. Pick another or leave it blank.",
      });
    }
  }

  if (!user.email) {
    return fail(
      {},
      "Your account doesn't have an email address. Please sign in again.",
    );
  }

  let result: Awaited<ReturnType<typeof createProfile>>;
  try {
    result = await createProfile(user, {
      firstName,
      lastName,
      branchInterest: branch,
      teamInterest,
    });
  } catch (error) {
    console.error("Profile create failed", error);
    return fail({}, "We couldn't save your details. Please try again.");
  }
  // "exists" is a double submit: the profile is already there, so carry on.
  if (result === "email-taken") {
    return fail(
      {},
      "This email is already linked to another volunteer profile. Please contact the KC team.",
    );
  }

  redirect("/course");
}

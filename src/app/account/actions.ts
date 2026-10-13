"use server";

import { redirect } from "next/navigation";
import { requireVolunteer } from "@/lib/auth";
import {
  NOT_SURE,
  ProfileDetailsSchema,
  type ProfileDetailsField,
} from "@/lib/schemas/onboarding";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount, updateAccountDetails } from "@/server/account";
import { findActiveTeamName } from "@/server/profiles";

export type AccountFormValues = {
  firstName: string;
  lastName: string;
  branchInterest: string;
  teamId: string;
};

export type AccountFormState =
  | { status: "idle" }
  | { status: "saved"; values: AccountFormValues }
  | {
      status: "error";
      values: AccountFormValues;
      errors: Partial<Record<ProfileDetailsField, string>>;
      formError?: string;
    };

export async function updateAccount(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const profile = await requireVolunteer("/account");

  const values: AccountFormValues = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    branchInterest: String(formData.get("branchInterest") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
  };
  const fail = (
    errors: Partial<Record<ProfileDetailsField, string>>,
    formError?: string,
  ): AccountFormState => ({ status: "error", values, errors, formError });

  const parsed = ProfileDetailsSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Partial<Record<ProfileDetailsField, string>> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as ProfileDetailsField] ??= issue.message;
    }
    return fail(errors);
  }

  const { firstName, lastName, branchInterest, teamId } = parsed.data;
  const branch = branchInterest === NOT_SURE ? null : branchInterest;
  let teamInterest: string | null = null;
  if (teamId && branch) {
    teamInterest = await findActiveTeamName(teamId, branch);
    if (!teamInterest) {
      return fail({
        teamId: "That team isn't available. Pick another or leave it blank.",
      });
    }
  }

  try {
    await updateAccountDetails(profile.id, {
      firstName,
      lastName,
      branchInterest: branch,
      teamInterest,
    });
  } catch (error) {
    console.error("Account update failed", error);
    return fail({}, "We couldn't save your changes. Please try again.");
  }
  return { status: "saved", values };
}

/** Deletes the signed-in volunteer's data and login, then signs them out. */
export async function deleteMyAccount() {
  const profile = await requireVolunteer("/account");
  const { authUserDeleted } = await deleteAccount(profile.id);

  // Clear the session cookies; the user may no longer exist on Supabase.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  redirect(authUserDeleted ? "/account-deleted" : "/account-deleted?partial=1");
}

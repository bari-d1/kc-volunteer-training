"use client";

import { useState } from "react";
import { FieldError, SelectField, TextField } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import { NOT_SURE } from "@/lib/schemas/onboarding";

export type BranchOption = {
  value: string;
  label: string;
  description?: string;
};

export type TeamOption = { id: string; name: string; branch: string };

export type ProfileFieldValues = {
  firstName: string;
  lastName: string;
  branchInterest: string;
  teamId: string;
};

export type ProfileFieldErrors = Partial<
  Record<keyof ProfileFieldValues, string>
>;

const accent: Record<string, string> = {
  EXPERIENCE:
    "has-checked:border-branch-experience [&_.dot]:bg-branch-experience",
  MINISTRY: "has-checked:border-branch-ministry [&_.dot]:bg-branch-ministry",
  CREATIVE: "has-checked:border-branch-creative [&_.dot]:bg-branch-creative",
  SYSTEMS: "has-checked:border-branch-systems [&_.dot]:bg-branch-systems",
  [NOT_SURE]: "has-checked:border-lime [&_.dot]:bg-muted",
};

/**
 * Name, branch interest and team interest. Shared by onboarding and
 * /account; render inside a form that's keyed on its values so a server
 * response resets these uncontrolled fields.
 */
export function ProfileFields({
  branches,
  teams,
  values,
  errors = {},
}: {
  branches: BranchOption[];
  teams: TeamOption[];
  values?: Partial<ProfileFieldValues>;
  errors?: ProfileFieldErrors;
}) {
  const [branch, setBranch] = useState(values?.branchInterest ?? "");

  const branchTeams = teams.filter((team) => team.branch === branch);
  const teamHint = !branch
    ? "Choose a branch first."
    : branch === NOT_SURE
      ? "No problem. You can pick a team later."
      : branchTeams.length === 0
        ? "No teams listed for this branch yet. You can skip this."
        : "Optional. Pick the team you'd most like to join.";

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          required
          defaultValue={values?.firstName}
          error={errors.firstName}
        />
        <TextField
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          required
          defaultValue={values?.lastName}
          error={errors.lastName}
        />
      </div>

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.branchInterest ? "branch-error" : undefined}
      >
        <legend className="mb-3 text-label text-muted">
          Which branch interests you?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {branches.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border-2 border-surface-2 bg-surface p-4 transition-colors hover:bg-surface-2 has-checked:bg-surface-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lime",
                accent[option.value],
              )}
            >
              <input
                type="radio"
                name="branchInterest"
                value={option.value}
                defaultChecked={values?.branchInterest === option.value}
                onChange={() => setBranch(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="dot mt-1.5 size-3 shrink-0 rounded-pill"
              />
              <span className="flex flex-col gap-1">
                <span className="text-body font-bold">{option.label}</span>
                {option.description && (
                  <span className="text-small text-muted">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        <FieldError id="branch-error">{errors.branchInterest}</FieldError>
      </fieldset>

      <SelectField
        // Remount when the branch changes so the old team doesn't linger.
        key={branch}
        label="Team interest (optional)"
        name="teamId"
        defaultValue={branch === values?.branchInterest ? values?.teamId : ""}
        disabled={branchTeams.length === 0}
        hint={teamHint}
        error={errors.teamId}
      >
        <option value="">No preference yet</option>
        {branchTeams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </SelectField>
    </>
  );
}

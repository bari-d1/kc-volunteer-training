"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  FieldError,
  SelectField,
  TextField,
} from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import { NOT_SURE } from "@/lib/schemas/onboarding";
import { completeOnboarding, type OnboardingState } from "./actions";

export type BranchOption = {
  value: string;
  label: string;
  description?: string;
};

export type TeamOption = { id: string; name: string; branch: string };

const accent: Record<string, string> = {
  EXPERIENCE:
    "has-checked:border-branch-experience [&_.dot]:bg-branch-experience",
  MINISTRY: "has-checked:border-branch-ministry [&_.dot]:bg-branch-ministry",
  CREATIVE: "has-checked:border-branch-creative [&_.dot]:bg-branch-creative",
  SYSTEMS: "has-checked:border-branch-systems [&_.dot]:bg-branch-systems",
  [NOT_SURE]: "has-checked:border-lime [&_.dot]:bg-muted",
};

export function OnboardingForm({
  branches,
  teams,
}: {
  branches: BranchOption[];
  teams: TeamOption[];
}) {
  const [state, formAction, pending] = useActionState<
    OnboardingState,
    FormData
  >(completeOnboarding, { status: "idle" });
  const values = state.status === "error" ? state.values : undefined;
  const errors = state.status === "error" ? state.errors : {};
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
    // key resets uncontrolled fields to the values returned with errors.
    <form
      key={state.status === "error" ? JSON.stringify(values) : "idle"}
      action={formAction}
      noValidate
      className="flex flex-col gap-8"
    >
      {state.status === "error" && state.formError && (
        <p
          role="alert"
          className="rounded-md border-2 border-danger bg-danger/10 p-4 text-body"
        >
          {state.formError}
        </p>
      )}

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

      <CheckboxField
        name="consent"
        required
        defaultChecked={values?.consent}
        error={errors.consent}
        label={
          <>
            I agree to KC storing my details to track my training.{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="font-bold text-lime underline underline-offset-4"
            >
              Privacy notice
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        }
      />

      <Button type="submit" size="lg" loading={pending} className="self-start">
        {pending ? "Saving…" : "Start my training"}
      </Button>
    </form>
  );
}

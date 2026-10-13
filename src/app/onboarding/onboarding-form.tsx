"use client";

import { useActionState } from "react";
import {
  ProfileFields,
  type BranchOption,
  type TeamOption,
} from "@/components/blocks/profile-fields";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { completeOnboarding, type OnboardingState } from "./actions";

export type { BranchOption, TeamOption };

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

      <ProfileFields
        branches={branches}
        teams={teams}
        values={values}
        errors={errors}
      />

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

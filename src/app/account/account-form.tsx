"use client";

import { useActionState } from "react";
import {
  ProfileFields,
  type BranchOption,
  type TeamOption,
} from "@/components/blocks/profile-fields";
import { Button } from "@/components/ui/button";
import {
  updateAccount,
  type AccountFormState,
  type AccountFormValues,
} from "./actions";

export function AccountForm({
  branches,
  teams,
  initialValues,
}: {
  branches: BranchOption[];
  teams: TeamOption[];
  initialValues: AccountFormValues;
}) {
  const [state, formAction, pending] = useActionState<
    AccountFormState,
    FormData
  >(updateAccount, { status: "idle" });
  const values = state.status === "idle" ? initialValues : state.values;

  return (
    <form
      key={JSON.stringify(values)}
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
        errors={state.status === "error" ? state.errors : {}}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p role="status" className="text-small text-success">
          {state.status === "saved" ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}

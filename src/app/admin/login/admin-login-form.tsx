"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/form-field";
import { adminLogin, type AdminLoginState } from "../actions";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<
    AdminLoginState,
    FormData
  >(adminLogin, {});

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {/* Lets password managers file the shared password under one name. */}
      <input
        type="text"
        name="username"
        value="kc-admin"
        autoComplete="username"
        readOnly
        hidden
      />
      <TextField
        label="Admin password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        error={state.error}
      />
      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}

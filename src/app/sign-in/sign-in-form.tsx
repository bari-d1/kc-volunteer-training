"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithMagicLink, type SignInState } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";

export function SignInForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInWithMagicLink,
    initialError
      ? { status: "error", message: initialError }
      : { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <h2 className="text-h2">Check your email</h2>
        <p className="text-body-lg text-muted">
          We&apos;ve sent a sign-in link to{" "}
          <strong className="text-text">{state.email}</strong>. It works once
          and expires soon, so open it on this device.
        </p>
        <p className="text-small text-muted">
          Nothing there? Check your spam folder, or{" "}
          <a
            href={`/sign-in?next=${encodeURIComponent(next)}`}
            className="font-bold text-lime underline underline-offset-4"
          >
            try a different email
          </a>
          .
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-label text-muted">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.status === "error" ? state.email : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          placeholder="you@example.com"
          className={cn(
            "h-14 rounded-md border-2 bg-surface px-4 text-body text-text placeholder:text-muted/70",
            error ? "border-danger" : "border-surface-2 focus:border-lime",
          )}
        />
        {error && (
          <p id="email-error" role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Sending…" : "Send me a link"}
      </Button>
      <p className="text-small text-muted">
        No password needed. We&apos;ll email you a one-time link to sign in.
      </p>
    </form>
  );
}

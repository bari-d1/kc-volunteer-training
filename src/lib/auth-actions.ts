"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/safe-next-path";
import { checkSignInRateLimit } from "@/lib/sign-in-rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

const SignInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  next: z.string().optional(),
});

/** Emails a magic link. No passwords for volunteers. */
export async function signInWithMagicLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  const typed = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return {
      status: "error",
      email: typed,
      message:
        "That doesn't look like an email address. Check it and try again.",
    };
  }
  const { email } = parsed.data;
  const next = safeNextPath(parsed.data.next);

  try {
    const limit = await checkSignInRateLimit(email);
    if (!limit.allowed) {
      return {
        status: "error",
        email,
        message: `You've asked for a few links already. Check your inbox (and spam), or try again in ${limit.retryAfterMinutes} minute${limit.retryAfterMinutes === 1 ? "" : "s"}.`,
      };
    }
  } catch (error) {
    console.error("Sign-in rate limit check failed", error);
    return {
      status: "error",
      email,
      message:
        "We couldn't send your link right now. Please try again in a moment.",
    };
  }

  const supabase = await createClient();
  const emailRedirectTo = `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo, shouldCreateUser: true },
  });

  if (error) {
    console.error("signInWithOtp failed", error.code, error.message);
    return {
      status: "error",
      email,
      message:
        error.status === 429
          ? "Lots of people are signing in right now. Please try again in a few minutes."
          : "We couldn't send your link right now. Please try again in a moment.",
    };
  }

  return { status: "sent", email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

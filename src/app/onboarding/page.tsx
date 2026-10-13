import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/blocks/sign-out-button";
import { getCurrentUser, getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome" };

// Placeholder until the profile form is built.
export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-gutter py-16">
      <Suspense>
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/onboarding");
  if (await getProfile(user.id)) redirect("/course");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">You&apos;re in!</h1>
      <p className="text-body-lg text-muted">
        Signed in as <strong className="text-text">{user.email}</strong>. Next
        we&apos;ll set up your volunteer profile.
      </p>
      <SignOutButton variant="secondary" />
    </div>
  );
}

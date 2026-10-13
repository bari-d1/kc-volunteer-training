import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/blocks/sign-out-button";
import { PillTag } from "@/components/ui/pill-tag";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { BRANCH_CODES, NOT_SURE } from "@/lib/schemas/onboarding";
import { getOnboardingOptions } from "@/server/profiles";
import { OnboardingForm, type BranchOption } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

const fallbackLabels: Record<(typeof BRANCH_CODES)[number], string> = {
  EXPERIENCE: "Experience",
  MINISTRY: "Ministry",
  CREATIVE: "Creative",
  SYSTEMS: "Systems",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-10 px-gutter py-16">
      <div className="flex flex-col gap-4">
        <PillTag>Welcome to the family</PillTag>
        <h1 className="text-h1">Let&apos;s get you set up</h1>
        <p className="text-body-lg text-muted">
          A few details so we can personalise your training. It takes under a
          minute.
        </p>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/onboarding");
  if (await getProfile(user.id)) redirect("/course");

  const { branches: branchRows, teams } = await getOnboardingOptions();

  // Names and descriptions come from the Branch table when it's populated.
  const byCode = new Map(branchRows.map((b) => [b.code, b]));
  const branches: BranchOption[] = [
    ...BRANCH_CODES.map((code) => ({
      value: code,
      label: byCode.get(code)?.name ?? fallbackLabels[code],
      description: byCode.get(code)?.description,
    })),
    {
      value: NOT_SURE,
      label: "Not sure yet",
      description: "We'll help you find your fit.",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <OnboardingForm branches={branches} teams={teams} />
      <div className="flex items-center gap-3 border-t border-surface-2 pt-6 text-small text-muted">
        <span>
          Signed in as <strong className="text-text">{user.email}</strong>
        </span>
        <SignOutButton />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-20" />
    </div>
  );
}

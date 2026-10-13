import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/blocks/sign-out-button";
import { LessonSkeleton } from "@/components/blocks/lesson-skeleton";
import { requireVolunteer } from "@/lib/auth";

export const metadata: Metadata = { title: "Your course" };

// Placeholder until the course dashboard is built.
export default function CoursePage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-gutter py-16">
      <Suspense fallback={<LessonSkeleton />}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const profile = await requireVolunteer("/course");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Welcome back, {profile.firstName}</h1>
      <p className="text-body-lg text-muted">
        Your course dashboard is coming soon.
      </p>
      <SignOutButton variant="secondary" />
    </div>
  );
}

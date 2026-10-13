import type { Metadata } from "next";
import { Suspense } from "react";
import { PillTag } from "@/components/ui/pill-tag";
import { safeNextPath } from "@/lib/safe-next-path";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  link: "That link has expired or was already used. Enter your email and we'll send a fresh one.",
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="flex flex-1 items-center justify-center px-gutter py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-4">
          <PillTag>KC Volunteers</PillTag>
          <h1 className="text-h1">Sign in</h1>
          <p className="text-body-lg text-muted">
            Enter your email and we&apos;ll send you a link to pick up your
            onboarding.
          </p>
        </div>
        {/* searchParams are request data, so the form renders per request. */}
        <Suspense fallback={<SignInForm next="/course" />}>
          {searchParams.then((params) => {
            const next = safeNextPath(single(params.next));
            const error = errors[single(params.error) ?? ""];
            return <SignInForm next={next} initialError={error} />;
          })}
        </Suspense>
      </div>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

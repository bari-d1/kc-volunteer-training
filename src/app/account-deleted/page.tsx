import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false },
};

export default function AccountDeletedPage({
  searchParams,
}: PageProps<"/account-deleted">) {
  return (
    <main className="flex min-h-[70dvh] flex-1 flex-col items-center justify-center gap-6 px-gutter py-16 text-center">
      <h1 className="text-h1">Your account has been deleted</h1>
      <Suspense
        fallback={
          <p className="max-w-md text-body-lg text-muted">
            Thanks for being part of KC.
          </p>
        }
      >
        {searchParams.then((params) =>
          params.partial ? (
            <p className="max-w-md text-body-lg text-muted">
              Your profile and training data are gone, but we couldn&apos;t
              fully remove your sign-in. Please contact the KC team and
              we&apos;ll finish it for you.
            </p>
          ) : (
            <p className="max-w-md text-body-lg text-muted">
              Your profile, training progress, reflection answers, quiz results
              and certificates have been removed. Thanks for being part of KC.
            </p>
          ),
        )}
      </Suspense>
      <Button href="/" variant="secondary">
        Back to home
      </Button>
    </main>
  );
}

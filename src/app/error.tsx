"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-1 flex-col items-center justify-center gap-6 px-gutter py-16 text-center">
      <div
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-pill bg-danger/15 text-danger"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 7v6M12 17h.01" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <h1 className="text-h2">Something went wrong</h1>
      <p className="max-w-md text-body-lg text-muted">
        We hit a snag loading this page. Try again, and if it keeps happening
        let your team leader know.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <Button href="/" size="lg" variant="ghost">
          Back to dashboard
        </Button>
      </div>
      {error.digest && (
        <p className="font-mono text-small text-muted">
          Error ID: {error.digest}
        </p>
      )}
    </main>
  );
}

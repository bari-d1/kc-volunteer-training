import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PillTag } from "@/components/ui/pill-tag";
import { Skeleton } from "@/components/ui/skeleton";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { confirmUnsubscribe } from "./actions";

export const metadata: Metadata = {
  title: "Email reminders",
  robots: { index: false, follow: false },
};

/**
 * Where a reminder email's Unsubscribe link lands. One button turns the
 * reminders off; no sign-in needed, since the signed token names the
 * volunteer.
 */
export default function UnsubscribePage({
  searchParams,
}: PageProps<"/email/unsubscribe">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-gutter py-16">
      <Logo priority className="h-14 self-start" />
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
        {searchParams.then((params) => (
          <Unsubscribe
            token={single(params.token)}
            done={single(params.done) === "1"}
            error={single(params.error) === "1"}
          />
        ))}
      </Suspense>
    </main>
  );
}

async function Unsubscribe({
  token,
  done,
  error,
}: {
  token?: string;
  done: boolean;
  error: boolean;
}) {
  if (done) {
    return (
      <section role="status" className="flex flex-col gap-4">
        <PillTag>Email reminders</PillTag>
        <h1 className="text-h1">You&apos;re unsubscribed</h1>
        <p className="text-body-lg text-muted">
          We won&apos;t send you any more reminder emails. You can turn them
          back on any time from your account.
        </p>
        <Link
          href="/course"
          className="w-fit font-bold text-lime underline underline-offset-4"
        >
          Go to your training
        </Link>
      </section>
    );
  }

  if (error || !(await verifyUnsubscribeToken(token))) {
    return (
      <section className="flex flex-col gap-4">
        <PillTag>Email reminders</PillTag>
        <h1 className="text-h1">That link didn&apos;t work</h1>
        <p className="text-body-lg text-muted">
          It may have been copied incompletely. You can turn reminders off from
          your account instead.
        </p>
        <Link
          href="/account"
          className="w-fit font-bold text-lime underline underline-offset-4"
        >
          Go to your account
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PillTag>Email reminders</PillTag>
        <h1 className="text-h1">Stop reminder emails?</h1>
        <p className="text-body-lg text-muted">
          We&apos;ll stop emailing you reminders to finish your training. You
          can turn them back on any time from your account.
        </p>
      </div>
      <form action={confirmUnsubscribe}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" className="w-full sm:w-fit">
          Unsubscribe
        </Button>
      </form>
    </section>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PillTag } from "@/components/ui/pill-tag";
import type { EarnedCertificate } from "@/server/completion";
import { Celebration } from "./celebration";
import { CertificateCard } from "./certificate-card";

/** The "You're part of the family" page, shown once the quiz is passed. */
export function CompletionPage({
  moduleId,
  completed,
  firstName,
  certificate,
  dashboardHref,
}: {
  moduleId: string;
  /** This module was already marked complete. */
  completed: boolean;
  firstName: string;
  certificate: EarnedCertificate;
  dashboardHref: string;
}) {
  return (
    <article className="flex flex-col gap-12">
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-lg bg-surface px-6 py-12 md:px-10 md:py-16">
        <Celebration moduleId={moduleId} completed={completed} />
        <Link
          href={dashboardHref}
          className="relative w-fit text-small font-bold text-muted hover:text-text"
        >
          <span aria-hidden="true">← </span>Back to your dashboard
        </Link>
        <PillTag className="relative">Training complete</PillTag>
        <h1 className="relative text-display text-balance uppercase">
          You&apos;re part of the family now.{" "}
          <span className="text-lime">Welcome to KC!</span>
        </h1>
        <p className="relative max-w-xl text-body-lg text-muted">
          Well done, {firstName}. Thank you for saying yes to serving in Kingdom
          Culture.
        </p>
      </header>

      <CertificateCard
        certificateNumber={certificate.certificateNumber}
        issuedAt={certificate.issuedAt}
      />

      <section aria-labelledby="next-steps" className="flex flex-col gap-4">
        <h2 id="next-steps" className="text-h2">
          What happens next
        </h2>
        <p className="rounded-lg border-l-4 border-lime bg-surface p-6 text-body-lg">
          A member of the KC onboarding team will be in touch with you directly
          to welcome you and help you get started.
        </p>
      </section>

      <Button
        href={dashboardHref}
        variant="secondary"
        size="lg"
        className="w-full sm:w-fit"
      >
        Back to your dashboard
      </Button>
    </article>
  );
}

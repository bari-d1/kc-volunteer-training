import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PillTag } from "@/components/ui/pill-tag";
import { cn } from "@/lib/cn";
import type { EarnedCertificate, Placement } from "@/server/completion";
import { Celebration } from "./celebration";
import { CertificateCard } from "./certificate-card";

const BRANCH_BORDER = {
  lime: "border-lime",
  experience: "border-branch-experience",
  ministry: "border-branch-ministry",
  creative: "border-branch-creative",
  systems: "border-branch-systems",
} as const;

export const WHAT_TO_EXPECT = [
  {
    title: "Sundays at 1:30pm",
    body: "Arrive at 1:30pm on Sundays for service prep.",
  },
  {
    title: "Monthly RECHARGE",
    body: "Once a month, for every volunteer.",
  },
  {
    title: "Prayer watches",
    body: "Times are shared in the volunteers' chat.",
  },
];

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-pill bg-lime text-body font-extrabold text-ink"
        >
          {number}
        </span>
        <h3 className="text-h3">{title}</h3>
      </div>
      {children}
    </li>
  );
}

/** The "You're part of the family" page, shown once the quiz is passed. */
export function CompletionPage({
  moduleId,
  completed,
  firstName,
  certificate,
  placement,
  dashboardHref,
}: {
  moduleId: string;
  /** This module was already marked complete. */
  completed: boolean;
  firstName: string;
  certificate: EarnedCertificate;
  placement: Placement | null;
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

      <section aria-labelledby="next-steps" className="flex flex-col gap-8">
        <h2 id="next-steps" className="text-h2">
          Your next steps
        </h2>
        <ol className="flex flex-col gap-10">
          <Step number={1} title="Your branch and team">
            {placement ? (
              <div
                className={cn(
                  "flex flex-col gap-4 rounded-lg border-l-4 bg-surface p-6",
                  BRANCH_BORDER[placement.colour],
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-label text-muted">Branch</span>
                  <span className="text-body-lg font-bold">
                    {placement.branchName}
                  </span>
                  <span className="text-body text-muted">
                    {placement.branchDescription}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-label text-muted">Team</span>
                  <span className="text-body-lg font-bold">
                    {placement.teamName ??
                      "Speak to your Branch Lead to choose a team"}
                  </span>
                </div>
                {placement.leads.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-label text-muted">
                      {placement.leads.length === 1
                        ? "Branch Lead"
                        : "Branch Leads"}
                    </span>
                    <span className="text-body-lg font-bold">
                      {placement.leads.map((l) => l.name).join(" and ")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-lg bg-surface p-6 text-body-lg">
                Speak to a Branch Lead to find your team.
              </p>
            )}
          </Step>

          <Step number={2} title="What to expect">
            <ul className="grid gap-4 sm:grid-cols-3">
              {WHAT_TO_EXPECT.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-2 rounded-lg bg-surface p-6"
                >
                  <span className="text-body-lg font-bold">{item.title}</span>
                  <span className="text-body text-muted">{item.body}</span>
                </li>
              ))}
            </ul>
          </Step>
        </ol>
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

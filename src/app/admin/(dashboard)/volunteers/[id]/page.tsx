import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { certificatePdfHref } from "@/lib/certificate-links";
import { cn } from "@/lib/cn";
import { getVolunteerDetail } from "@/server/admin/volunteers";
import { VolunteerActions } from "./volunteer-actions";

export const metadata: Metadata = { title: "Volunteer" };

const date = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});
const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

export default function AdminVolunteerPage({
  params,
}: PageProps<"/admin/volunteers/[id]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ id }) => (
        <Volunteer id={id} />
      ))}
    </Suspense>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="text-small font-bold break-words">{children}</dd>
    </div>
  );
}

async function Volunteer({ id }: { id: string }) {
  await requireAdmin();
  const volunteer = await getVolunteerDetail(id);
  if (!volunteer) notFound();
  const { profile, modules, attempts, certificate, emails } = volunteer;
  const name = `${profile.firstName} ${profile.lastName}`;
  const done = modules.filter((m) => m.completedAt).length;

  return (
    <>
      <Link
        href="/admin/volunteers"
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>All volunteers
      </Link>
      <PageHeader
        title={name}
        description={profile.email}
        actions={<VolunteerActions id={profile.id} name={profile.firstName} />}
      />

      <Section title="Profile">
        <dl className="grid grid-cols-2 gap-4 rounded-md border border-surface-2 bg-surface p-4 md:grid-cols-4">
          <Detail label="Branch">
            {profile.branchInterest
              ? profile.branchInterest.charAt(0) +
                profile.branchInterest.slice(1).toLowerCase()
              : "Not sure yet"}
          </Detail>
          <Detail label="Team">{profile.teamInterest ?? "–"}</Detail>
          <Detail label="Signed up">{date.format(profile.createdAt)}</Detail>
          <Detail label="Consent given">
            {dateTime.format(profile.consentAt)}
          </Detail>
          <Detail label="Email reminders">
            {profile.emailReminders ? "On" : "Off"}
          </Detail>
          <Detail label="Guide">
            {profile.hideNarrator ? "Hidden" : "On"}
          </Detail>
          <Detail label="Certificate">
            {certificate ? (
              <a
                href={certificatePdfHref(certificate.certificateNumber)}
                className="text-lime underline underline-offset-4"
              >
                {certificate.certificateNumber}
              </a>
            ) : (
              "Not yet"
            )}
          </Detail>
          {certificate && (
            <Detail label="Completed">
              {date.format(certificate.issuedAt)}
            </Detail>
          )}
        </dl>
      </Section>

      <Section title={`Module progress (${done} of ${modules.length})`}>
        <ol className="divide-y divide-surface-2 rounded-md border border-surface-2">
          {modules.map((m, index) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4 px-4 py-2 text-small"
            >
              <span>
                <span className="text-muted tabular-nums">{index + 1}.</span>{" "}
                {m.title}
              </span>
              <span
                className={cn(
                  "shrink-0",
                  m.completedAt ? "text-lime" : "text-muted",
                )}
              >
                {m.completedAt
                  ? `Completed ${date.format(m.completedAt)}`
                  : m.started
                    ? "Started"
                    : "Not started"}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Quiz attempts">
        {attempts.length === 0 ? (
          <p className="text-small text-muted">No quiz attempts yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="rounded-md border border-surface-2 bg-surface"
              >
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-small">
                    <span className="font-bold">
                      {dateTime.format(
                        attempt.submittedAt ?? attempt.startedAt,
                      )}
                    </span>
                    {attempt.submittedAt ? (
                      <>
                        <span className="tabular-nums">
                          {attempt.score}/{attempt.total}
                        </span>
                        <span
                          className={
                            attempt.passed ? "text-lime" : "text-danger"
                          }
                        >
                          {attempt.passed ? "Passed" : "Not passed"}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">Not submitted</span>
                    )}
                  </summary>
                  {attempt.submittedAt && (
                    <ol className="flex flex-col gap-2 border-t border-surface-2 px-4 py-3">
                      {attempt.answers.map((a, index) => (
                        <li key={a.questionId} className="text-small">
                          <p className="font-bold">
                            {index + 1}. {a.prompt}
                          </p>
                          <p
                            className={a.correct ? "text-lime" : "text-danger"}
                          >
                            {a.correct ? "Right: " : "Wrong: "}
                            {a.answer ?? "(no answer)"}
                          </p>
                          {!a.correct && a.correctAnswer && (
                            <p className="text-muted">
                              Correct answer: {a.correctAnswer}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Emails sent">
        {emails.length === 0 ? (
          <p className="text-small text-muted">No emails yet.</p>
        ) : (
          <ul className="divide-y divide-surface-2 rounded-md border border-surface-2">
            {emails.map((email) => (
              <li
                key={email.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-small"
              >
                <span className="font-bold capitalize">{email.template}</span>
                <span
                  className={cn(
                    email.status === "SENT"
                      ? "text-text"
                      : email.status === "FAILED"
                        ? "text-danger"
                        : "text-muted",
                  )}
                  title={email.error ?? undefined}
                >
                  {email.status.toLowerCase()}
                </span>
                <span className="text-muted">
                  {dateTime.format(email.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

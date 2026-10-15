import { CertificateCard } from "@/components/completion/certificate-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTag } from "@/components/ui/pill-tag";
import { ProgressRing } from "@/components/ui/progress-ring";
import { moduleHref } from "@/lib/course-config";
import type { Dashboard } from "@/lib/dashboard";
import { ModuleCard } from "./module-card";

export function CourseDashboard({
  courseSlug,
  firstName,
  dashboard,
  certificate = null,
}: {
  courseSlug: string;
  firstName: string;
  dashboard: Dashboard;
  /** Set once they've passed the quiz: the hero switches to Completed. */
  certificate?: { certificateNumber: string; issuedAt: Date } | null;
}) {
  const {
    cards,
    next,
    started,
    allComplete,
    completionModule,
    percent,
    completed,
    total,
  } = dashboard;

  if (total === 0) {
    return (
      <div className="flex flex-col gap-10">
        <Hero firstName={firstName} />
        <EmptyState
          title="No modules yet"
          description="Your training will appear here once it's published. Check back soon."
        />
      </div>
    );
  }

  const hero = certificate ? (
    <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div className="flex flex-col gap-5">
        <PillTag>Completed</PillTag>
        <h1 className="text-display">You did it, {firstName}!</h1>
        <p className="max-w-xl text-body-lg text-muted">
          You&apos;ve passed the final quiz. Welcome to the KC volunteer family.
        </p>
        {completionModule && (
          <Button
            href={moduleHref(courseSlug, completionModule.slug)}
            size="lg"
            className="h-auto! min-h-14 self-start py-3 text-left whitespace-normal!"
          >
            See your next steps
          </Button>
        )}
      </div>
      <CertificateCard
        certificateNumber={certificate.certificateNumber}
        issuedAt={certificate.issuedAt}
      />
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-12">
      {hero ?? (
        <section className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          {allComplete ? (
            <div className="flex flex-col gap-5">
              <PillTag>Training complete</PillTag>
              <h1 className="text-display">You did it, {firstName}!</h1>
              <p className="max-w-xl text-body-lg text-muted">
                You&apos;ve completed every module. Welcome to the KC volunteer
                family.
              </p>
              {completionModule && (
                <Button
                  href={moduleHref(courseSlug, completionModule.slug)}
                  size="lg"
                  className="h-auto! min-h-14 self-start py-3 text-left whitespace-normal!"
                >
                  See what&apos;s next
                </Button>
              )}
            </div>
          ) : (
            <Hero firstName={firstName}>
              {next && (
                <Button
                  href={moduleHref(courseSlug, next.slug)}
                  size="lg"
                  className="h-auto! min-h-14 self-start py-3 text-left whitespace-normal!"
                >
                  {started ? `Continue: ${next.title}` : "Start"}
                </Button>
              )}
            </Hero>
          )}
          <div className="flex items-center gap-4 self-start md:flex-col md:self-center">
            <ProgressRing
              value={percent}
              label="Course progress"
              size={128}
              strokeWidth={10}
            />
            <p className="text-small text-muted md:text-center">
              {completed} of {total} modules complete
            </p>
          </div>
        </section>
      )}

      <section
        aria-labelledby="modules-heading"
        className="flex flex-col gap-6"
      >
        <h2 id="modules-heading" className="text-h2">
          Your modules
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <ModuleCard
                card={card}
                href={moduleHref(courseSlug, card.slug)}
              />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Hero({
  firstName,
  children,
}: {
  firstName: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PillTag>Volunteers training</PillTag>
      <h1 className="text-display">Welcome, {firstName}</h1>
      <p className="max-w-xl text-body-lg text-muted">
        Work through each module at your own pace. Your progress saves as you
        go.
      </p>
      {children}
    </div>
  );
}

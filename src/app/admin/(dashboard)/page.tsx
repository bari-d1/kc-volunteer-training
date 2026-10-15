import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { CourseFilter } from "@/components/admin/course-filter";
import {
  BranchChart,
  ModuleFunnelChart,
  WeeklySignupsChart,
} from "@/components/admin/overview-charts";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";
import { formatChange } from "@/lib/stat-change";
import {
  getBranchBreakdown,
  getHeadlineStats,
  getModuleFunnel,
  getRecentActivity,
  getStatsCourse,
  getWeeklySignups,
  listStatsCourses,
} from "@/server/admin/stats";

export const metadata: Metadata = { title: "Overview" };

const activityDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export default function AdminOverviewPage({
  searchParams,
}: PageProps<"/admin">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {searchParams.then((params) => (
        <Overview
          courseSlug={
            typeof params.course === "string" ? params.course : undefined
          }
        />
      ))}
    </Suspense>
  );
}

async function Overview({ courseSlug }: { courseSlug?: string }) {
  await requireAdmin();
  const [course, courses] = await Promise.all([
    getStatsCourse(courseSlug),
    listStatsCourses(),
  ]);
  if (!course) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState
          title="No course yet"
          description="Seed or create a course to see how volunteers are getting on."
        />
      </>
    );
  }

  const [stats, funnel, weekly, branches, activity] = await Promise.all([
    getHeadlineStats(course.id),
    getModuleFunnel(course.id),
    getWeeklySignups(),
    getBranchBreakdown(),
    getRecentActivity(course.id),
  ]);
  const show = (value: number | null, suffix = "") =>
    value == null ? "–" : `${value}${suffix}`;

  return (
    <>
      <PageHeader
        title="Overview"
        description="How volunteers are getting on with their onboarding."
        actions={<CourseFilter courses={courses} current={course.slug} />}
      />

      <section
        aria-label="Headline numbers"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <StatCard
          label="Signed up"
          value={show(stats.signedUp.value)}
          hint={formatChange(stats.signedUp.change)}
        />
        <StatCard
          label="In progress"
          value={show(stats.inProgress.value)}
          hint={formatChange(stats.inProgress.change)}
        />
        <StatCard
          label="Completed"
          value={show(stats.completed.value)}
          hint={formatChange(stats.completed.change)}
        />
        <StatCard
          label="Completion rate"
          value={show(stats.completionRate.value, "%")}
          hint={formatChange(stats.completionRate.change, " pts")}
        />
        <StatCard
          label="Passed quiz first time"
          value={show(stats.firstAttemptPassRate.value, "%")}
          hint={formatChange(stats.firstAttemptPassRate.change, " pts")}
        />
        <StatCard
          label="Average attempts to pass"
          value={show(stats.averageAttemptsToPass.value)}
          hint={formatChange(stats.averageAttemptsToPass.change)}
        />
      </section>

      <ModuleFunnelChart data={funnel} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklySignupsChart data={weekly} />
        <BranchChart data={branches} />
      </div>

      <section
        aria-labelledby="recent-activity"
        className="flex flex-col gap-3"
      >
        <h2 id="recent-activity" className="text-h3">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-small text-muted">No sign-ups yet.</p>
        ) : (
          <ul className="divide-y divide-surface-2 rounded-md border border-surface-2">
            {activity.map((item) => (
              <li
                key={`${item.kind}-${item.name}-${item.at.toISOString()}`}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-small"
              >
                <span>
                  <span className="font-bold">{item.name}</span>{" "}
                  {item.kind === "completed" ? (
                    <span className="text-lime">completed the course</span>
                  ) : (
                    <span className="text-muted">signed up</span>
                  )}
                </span>
                <time
                  dateTime={item.at.toISOString()}
                  className="shrink-0 text-muted tabular-nums"
                >
                  {activityDate.format(item.at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

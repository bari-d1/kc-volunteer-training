import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdmin } from "@/lib/admin-auth";
import { getOverviewStats } from "@/server/admin/overview";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin();
  const stats = await getOverviewStats();
  return (
    <>
      <PageHeader
        title="Overview"
        description="How volunteers are getting on with their onboarding."
      />
      <section
        aria-label="Volunteer numbers"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Volunteers"
          value={stats.volunteers}
          hint={`${stats.newThisWeek} joined this week`}
        />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="In progress" value={stats.inProgress} />
        <StatCard label="Not started" value={stats.notStarted} />
        <StatCard
          label="Quiz pass rate"
          value={stats.passRate === null ? "–" : `${stats.passRate}%`}
          hint={`${stats.quizAttempts} attempt${stats.quizAttempts === 1 ? "" : "s"}`}
        />
      </section>
    </>
  );
}

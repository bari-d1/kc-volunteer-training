import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseLayout } from "@/components/blocks/course-layout";
import { CourseDashboard } from "@/components/blocks/dashboard/course-dashboard";
import { DashboardNotice } from "@/components/blocks/dashboard/dashboard-notice";
import { NarratorConfig } from "@/components/narrator/narrator-context";
import { NarratorWelcome } from "@/components/narrator/narrator-welcome";
import { isDashboardNotice } from "@/lib/dashboard-notices";
import { DashboardSkeleton } from "@/components/blocks/dashboard/dashboard-skeleton";
import { requireVolunteer } from "@/lib/auth";
import { courseNav } from "@/lib/course-config";
import { buildDashboard } from "@/lib/dashboard";
import { getModulesWithProgress, getPublishedCourse } from "@/server/courses";

export const metadata: Metadata = { title: "Your training" };

export default function CourseDashboardPage({
  params,
  searchParams,
}: PageProps<"/course/[courseSlug]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ courseSlug }, { notice }] = await Promise.all([
    params,
    searchParams,
  ]);
  const profile = await requireVolunteer(`/course/${courseSlug}`);
  const course = await getPublishedCourse(courseSlug);
  if (!course) notFound();

  const modules = await getModulesWithProgress(course.id, profile.id);
  return (
    <CourseLayout
      course={courseNav(
        courseSlug,
        course.title,
        modules.map((m) => ({ ...m, started: m.progress !== null })),
      )}
      showSidebar={false}
      width="wide"
    >
      {isDashboardNotice(notice) && <DashboardNotice notice={notice} />}
      <NarratorConfig enabled={!profile.hideNarrator} />
      <NarratorWelcome firstName={profile.firstName} />
      <CourseDashboard
        courseSlug={courseSlug}
        firstName={profile.firstName}
        dashboard={buildDashboard(modules)}
      />
    </CourseLayout>
  );
}

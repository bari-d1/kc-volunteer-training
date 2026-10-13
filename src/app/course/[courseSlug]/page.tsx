import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseLayout } from "@/components/blocks/course-layout";
import { CourseDashboard } from "@/components/blocks/dashboard/course-dashboard";
import { DashboardSkeleton } from "@/components/blocks/dashboard/dashboard-skeleton";
import { requireVolunteer } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";
import { getModulesWithProgress, getPublishedCourse } from "@/server/courses";

export const metadata: Metadata = { title: "Your training" };

export default function CourseDashboardPage({
  params,
}: PageProps<"/course/[courseSlug]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard params={params} />
    </Suspense>
  );
}

async function Dashboard({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const profile = await requireVolunteer(`/course/${courseSlug}`);
  const course = await getPublishedCourse(courseSlug);
  if (!course) notFound();

  const modules = await getModulesWithProgress(course.id, profile.id);
  return (
    <CourseLayout
      course={{
        title: course.title,
        modules: modules.map((m) => ({
          id: m.slug,
          title: m.title,
          status: m.status,
        })),
      }}
      showSidebar={false}
      width="wide"
    >
      <CourseDashboard
        courseSlug={courseSlug}
        firstName={profile.firstName}
        dashboard={buildDashboard(modules)}
      />
    </CourseLayout>
  );
}

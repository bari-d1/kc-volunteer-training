import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { listCourses } from "@/server/admin/courses";
import { CoursesTable } from "./courses-table";
import { NewCourseButton } from "./new-course-button";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin();
  const courses = await listCourses();
  return (
    <>
      <PageHeader
        title="Content"
        description="Courses and the modules in them."
        actions={<NewCourseButton />}
      />
      <CoursesTable
        rows={courses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          isPublished: c.isPublished,
          moduleCount: c._count.modules,
        }))}
      />
    </>
  );
}

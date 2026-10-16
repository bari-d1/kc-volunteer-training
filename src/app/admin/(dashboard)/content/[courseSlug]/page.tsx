import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
import { getCourseBySlug } from "@/server/admin/courses";
import { listModules } from "@/server/admin/modules";
import { DeleteCourseButton } from "../delete-course-button";
import { ModuleList } from "../module-list";

export const metadata: Metadata = { title: "Course" };

export default function AdminCoursePage({
  params,
}: PageProps<"/admin/content/[courseSlug]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseSlug }) => (
        <Course courseSlug={courseSlug} />
      ))}
    </Suspense>
  );
}

async function Course({ courseSlug }: { courseSlug: string }) {
  await requireAdmin();
  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  const modules = await listModules(course.id);

  return (
    <>
      <Link
        href="/admin/content"
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>All courses
      </Link>
      <PageHeader
        title={course.title}
        description={`/${course.slug} · ${course.isPublished ? "Published" : "Unpublished"} · ${modules.length} module${modules.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Button href={`/admin/content/${course.slug}/new`} size="sm">
              New module
            </Button>
            {course.slug !== DEFAULT_COURSE_SLUG && (
              <DeleteCourseButton
                id={course.id}
                title={course.title}
                moduleCount={modules.length}
              />
            )}
          </>
        }
      />
      <p
        role="note"
        className="rounded-md border-l-4 border-branch-creative bg-surface p-3 text-small"
      >
        <strong>Changes go live straight away.</strong> Reordering and
        publishing take effect for volunteers immediately, and modules unlock in
        this order, so moving a published module changes what volunteers partway
        through the course can open next.
      </p>
      <ModuleList
        courseId={course.id}
        courseSlug={course.slug}
        modules={modules}
      />
    </>
  );
}

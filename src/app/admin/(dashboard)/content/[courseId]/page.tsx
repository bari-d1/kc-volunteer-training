import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { getCourse } from "@/server/admin/courses";
import { listModules } from "@/server/admin/modules";
import { ModuleList } from "../module-list";

export const metadata: Metadata = { title: "Course" };

export default function AdminCoursePage({
  params,
}: PageProps<"/admin/content/[courseId]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseId }) => (
        <Course courseId={courseId} />
      ))}
    </Suspense>
  );
}

async function Course({ courseId }: { courseId: string }) {
  await requireAdmin();
  if (!z.uuid().safeParse(courseId).success) notFound();
  const course = await getCourse(courseId);
  if (!course) notFound();
  const modules = await listModules(courseId);

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
          <Button href={`/admin/content/${courseId}/modules/new`} size="sm">
            New module
          </Button>
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
      <ModuleList courseId={courseId} modules={modules} />
    </>
  );
}

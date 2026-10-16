import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getCourseBySlug } from "@/server/admin/courses";
import { ModuleForm } from "../../module-form";

export const metadata: Metadata = { title: "New module" };

export default function NewModulePage({
  params,
}: PageProps<"/admin/content/[courseSlug]/new">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseSlug }) => (
        <NewModule courseSlug={courseSlug} />
      ))}
    </Suspense>
  );
}

async function NewModule({ courseSlug }: { courseSlug: string }) {
  await requireAdmin();
  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  return (
    <>
      <Link
        href={`/admin/content/${course.slug}`}
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>
        {course.title}
      </Link>
      <PageHeader
        title="New module"
        description="It's added at the end of the course, unpublished."
      />
      <ModuleForm courseId={course.id} courseSlug={course.slug} />
    </>
  );
}

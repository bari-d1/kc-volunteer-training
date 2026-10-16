import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getCourse } from "@/server/admin/courses";
import { ModuleForm } from "../../../module-form";

export const metadata: Metadata = { title: "New module" };

export default function NewModulePage({
  params,
}: PageProps<"/admin/content/[courseId]/modules/new">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseId }) => (
        <NewModule courseId={courseId} />
      ))}
    </Suspense>
  );
}

async function NewModule({ courseId }: { courseId: string }) {
  await requireAdmin();
  if (!z.uuid().safeParse(courseId).success) notFound();
  const course = await getCourse(courseId);
  if (!course) notFound();
  return (
    <>
      <Link
        href={`/admin/content/${courseId}`}
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>
        {course.title}
      </Link>
      <PageHeader
        title="New module"
        description="It's added at the end of the course, unpublished."
      />
      <ModuleForm courseId={courseId} />
    </>
  );
}

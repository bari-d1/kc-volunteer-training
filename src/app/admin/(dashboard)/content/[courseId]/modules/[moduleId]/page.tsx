import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getModuleWithBlocks } from "@/server/admin/modules";
import { ModuleForm } from "../../../module-form";

export const metadata: Metadata = { title: "Edit module" };

export default function EditModulePage({
  params,
}: PageProps<"/admin/content/[courseId]/modules/[moduleId]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseId, moduleId }) => (
        <EditModule courseId={courseId} moduleId={moduleId} />
      ))}
    </Suspense>
  );
}

async function EditModule({
  courseId,
  moduleId,
}: {
  courseId: string;
  moduleId: string;
}) {
  await requireAdmin();
  if (!z.uuid().safeParse(moduleId).success) notFound();
  const courseModule = await getModuleWithBlocks(moduleId);
  if (!courseModule || courseModule.courseId !== courseId) notFound();
  return (
    <>
      <Link
        href={`/admin/content/${courseId}`}
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>All modules
      </Link>
      <PageHeader
        title={courseModule.title}
        description={`${courseModule.isPublished ? "Published" : "Unpublished"} · ${courseModule.blocks.length} block${courseModule.blocks.length === 1 ? "" : "s"}`}
      />
      <ModuleForm
        courseId={courseId}
        moduleId={moduleId}
        initial={{
          title: courseModule.title,
          slug: courseModule.slug,
          summary: courseModule.summary,
          narratorIntro: courseModule.narratorIntro ?? "",
          requiresCheck: courseModule.requiresCheck,
        }}
      />
    </>
  );
}

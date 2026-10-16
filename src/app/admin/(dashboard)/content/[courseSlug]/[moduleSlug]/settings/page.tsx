import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getModuleBySlugs } from "@/server/admin/modules";
import { ModuleForm } from "../../../module-form";

export const metadata: Metadata = { title: "Module settings" };

export default function ModuleSettingsPage({
  params,
}: PageProps<"/admin/content/[courseSlug]/[moduleSlug]/settings">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseSlug, moduleSlug }) => (
        <ModuleSettings courseSlug={courseSlug} moduleSlug={moduleSlug} />
      ))}
    </Suspense>
  );
}

async function ModuleSettings({
  courseSlug,
  moduleSlug,
}: {
  courseSlug: string;
  moduleSlug: string;
}) {
  await requireAdmin();
  const courseModule = await getModuleBySlugs(courseSlug, moduleSlug);
  if (!courseModule) notFound();
  return (
    <>
      <Link
        href={`/admin/content/${courseSlug}/${moduleSlug}`}
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>Back to the editor
      </Link>
      <PageHeader
        title={`${courseModule.title}: settings`}
        description={`${courseModule.isPublished ? "Published" : "Unpublished"} · ${courseModule._count.blocks} block${courseModule._count.blocks === 1 ? "" : "s"}`}
      />
      <ModuleForm
        courseId={courseModule.course.id}
        courseSlug={courseSlug}
        moduleId={courseModule.id}
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { BlockEditor } from "@/components/admin/block-editor/block-editor";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { getModuleEditor } from "@/server/admin/blocks";

export const metadata: Metadata = { title: "Edit module" };

export default function ModuleEditorPage({
  params,
}: PageProps<"/admin/content/[courseSlug]/[moduleSlug]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ courseSlug, moduleSlug }) => (
        <Editor courseSlug={courseSlug} moduleSlug={moduleSlug} />
      ))}
    </Suspense>
  );
}

async function Editor({
  courseSlug,
  moduleSlug,
}: {
  courseSlug: string;
  moduleSlug: string;
}) {
  await requireAdmin();
  const editor = await getModuleEditor(courseSlug, moduleSlug);
  if (!editor) notFound();
  const { module } = editor;

  return (
    <>
      <Link
        href={`/admin/content/${courseSlug}`}
        className="w-fit text-small font-bold text-muted hover:text-text"
      >
        <span aria-hidden="true">← </span>
        {module.course.title}
      </Link>
      <PageHeader
        title={module.title}
        description={`${module.isPublished ? "Published" : "Unpublished"} module · /${module.slug}`}
        actions={
          <Button
            href={`/admin/content/${courseSlug}/${moduleSlug}/settings`}
            variant="ghost"
            size="sm"
          >
            Module settings
          </Button>
        }
      />
      <BlockEditor
        moduleId={module.id}
        previewHref={`/admin/preview/${courseSlug}/${moduleSlug}`}
        initialBlocks={editor.blocks}
        hasUnpublishedChanges={editor.hasUnpublishedChanges}
        deletedCount={editor.deletedCount}
      />
    </>
  );
}

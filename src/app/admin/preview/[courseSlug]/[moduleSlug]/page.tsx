import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PillTag } from "@/components/ui/pill-tag";
import { requireAdmin } from "@/lib/admin-auth";
import type { VolunteerBlock } from "@/lib/schemas/blocks";
import { getModulePreview } from "@/server/admin/blocks";
import { PreviewFrame } from "./preview-frame";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * The module as volunteers will see it once its changes are published:
 * draft content, through the real BlockRenderer.
 */
export default function ModulePreviewPage({
  params,
  searchParams,
}: PageProps<"/admin/preview/[courseSlug]/[moduleSlug]">) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-gutter py-6">
      <Suspense fallback={<AdminPageSkeleton />}>
        {Promise.all([params, searchParams]).then(
          ([{ courseSlug, moduleSlug }, { frame }]) => (
            <Preview
              courseSlug={courseSlug}
              moduleSlug={moduleSlug}
              framed={frame === "1"}
            />
          ),
        )}
      </Suspense>
    </main>
  );
}

/** framed: just the lesson, for the phone-width iframe. */
async function Preview({
  courseSlug,
  moduleSlug,
  framed,
}: {
  courseSlug: string;
  moduleSlug: string;
  framed: boolean;
}) {
  await requireAdmin();
  const preview = await getModulePreview(courseSlug, moduleSlug);
  if (!preview) notFound();
  const { module, blocks } = preview;
  // The intro opens the lesson, as on the volunteer page.
  const withIntro: VolunteerBlock[] = module.narratorIntro
    ? [
        {
          id: `${module.id}-intro`,
          type: "NARRATOR_CALLOUT",
          content: { state: "wave", text: module.narratorIntro },
        },
        ...blocks,
      ]
    : blocks;

  const lesson = (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <PillTag>{module.course.title}</PillTag>
        <h1 className="text-display">{module.title}</h1>
        {module.summary && (
          <p className="text-body-lg text-muted">{module.summary}</p>
        )}
      </header>
      <BlockRenderer blocks={withIntro} moduleId={module.id} />
    </article>
  );
  if (framed) return lesson;

  return (
    <>
      <p
        role="note"
        className="mx-auto w-full max-w-[808px] rounded-md border-l-4 border-branch-creative bg-surface p-3 text-small"
      >
        <strong>Preview with unpublished changes.</strong> This is how the
        module will look once published. Knowledge checks can&apos;t be answered
        here.
      </p>
      <PreviewFrame
        frameSrc={`/admin/preview/${encodeURIComponent(courseSlug)}/${encodeURIComponent(moduleSlug)}?frame=1`}
      >
        {lesson}
      </PreviewFrame>
    </>
  );
}

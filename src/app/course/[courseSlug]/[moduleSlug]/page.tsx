import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { CourseLayout } from "@/components/blocks/course-layout";
import { LessonProgress } from "@/components/blocks/lesson/lesson-progress";
import { LessonSkeleton } from "@/components/blocks/lesson-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTag } from "@/components/ui/pill-tag";
import { requireVolunteer } from "@/lib/auth";
import {
  courseHref,
  courseNav,
  moduleHref,
  PLACEHOLDER_MODULE_SLUGS,
} from "@/lib/course-config";
import type { VolunteerBlock } from "@/lib/schemas/blocks";
import { getModuleForVolunteer, getPublishedCourse } from "@/server/courses";

export const metadata: Metadata = { title: "Lesson" };

export default function LessonPage({
  params,
}: PageProps<"/course/[courseSlug]/[moduleSlug]">) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const profile = await requireVolunteer(moduleHref(courseSlug, moduleSlug));
  const course = await getPublishedCourse(courseSlug);
  if (!course) notFound();

  const lesson = await getModuleForVolunteer(course.id, moduleSlug, profile.id);
  if (lesson.status === "not-found") notFound();
  if (lesson.status === "locked")
    redirect(`${courseHref(courseSlug)}?notice=locked`);

  const { module, progress, next } = lesson;
  // The module's narratorIntro opens the lesson as a narrator callout.
  const blocks: VolunteerBlock[] = module.narratorIntro
    ? [
        {
          id: `${module.id}-intro`,
          type: "NARRATOR_CALLOUT",
          content: { state: "wave", text: module.narratorIntro },
        },
        ...lesson.blocks,
      ]
    : lesson.blocks;
  const orders = lesson.blocks.map((b) => b.order ?? 0);
  const placeholder = PLACEHOLDER_MODULE_SLUGS.has(module.slug);

  return (
    <CourseLayout
      course={courseNav(courseSlug, course.title, lesson.outline)}
      currentModuleId={module.slug}
    >
      <article className="flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Link
            href={courseHref(courseSlug)}
            className="w-fit text-small font-bold text-muted hover:text-text"
          >
            <span aria-hidden="true">← </span>All modules
          </Link>
          <PillTag>Module {lesson.number}</PillTag>
          <h1 className="text-display">{module.title}</h1>
          {module.summary && (
            <p className="text-body-lg text-muted">{module.summary}</p>
          )}
        </header>

        <LessonProgress
          moduleId={module.id}
          requiresCheck={module.requiresCheck}
          initial={{
            lastBlockOrder: progress?.lastBlockOrder ?? 0,
            checkPassed: progress?.checkPassed ?? false,
            completed: Boolean(progress?.completedAt),
          }}
          firstBlockOrder={orders.length ? Math.min(...orders) : 0}
          continueHref={
            next ? moduleHref(courseSlug, next.slug) : courseHref(courseSlug)
          }
          nextTitle={next?.title ?? null}
        >
          {placeholder ? (
            <EmptyState
              title="Coming in Phase 6"
              description="This part of your training is still being built. You can continue for now."
            />
          ) : (
            <BlockRenderer
              blocks={blocks}
              moduleId={module.id}
              hideNarrator={profile.hideNarrator}
            />
          )}
        </LessonProgress>
      </article>
    </CourseLayout>
  );
}

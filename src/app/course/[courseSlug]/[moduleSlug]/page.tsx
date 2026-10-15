import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { CourseLayout } from "@/components/blocks/course-layout";
import { LessonHeading } from "@/components/blocks/lesson/lesson-heading";
import { NarratorConfig } from "@/components/narrator/narrator-context";
import { FinalQuiz } from "@/components/quiz/final-quiz";
import { LessonProgress } from "@/components/blocks/lesson/lesson-progress";
import { LessonSkeleton } from "@/components/blocks/lesson-skeleton";
import { PillTag } from "@/components/ui/pill-tag";
import { requireVolunteer } from "@/lib/auth";
import { courseHref, courseNav, moduleHref } from "@/lib/course-config";
import type { VolunteerBlock } from "@/lib/schemas/blocks";
import { getModuleForVolunteer, getPublishedCourse } from "@/server/courses";
import { FINAL_QUIZ_SLUG, getQuizIntro } from "@/server/quiz";
import {
  COMPLETION_SLUG,
  getCertificate,
  getPlacement,
  getWhatsappUrl,
} from "@/server/completion";
import { CompletionPage } from "@/components/completion/completion-page";

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

  // The last module opens only once the quiz is passed (which issues the
  // certificate); until then, send them to the quiz.
  if (moduleSlug === COMPLETION_SLUG) {
    const certificate = await getCertificate(profile.id, course.id);
    if (lesson.status === "locked" || !certificate)
      redirect(moduleHref(courseSlug, FINAL_QUIZ_SLUG));
    const [whatsappUrl, placement] = await Promise.all([
      getWhatsappUrl(),
      getPlacement(profile),
    ]);
    return (
      <CourseLayout
        course={courseNav(courseSlug, course.title, lesson.outline)}
        currentModuleId={lesson.module.slug}
      >
        <NarratorConfig hidden={profile.hideNarrator} />
        <CompletionPage
          moduleId={lesson.module.id}
          completed={Boolean(lesson.progress?.completedAt)}
          firstName={profile.firstName}
          certificate={certificate}
          whatsappUrl={whatsappUrl}
          placement={placement}
          dashboardHref={courseHref(courseSlug)}
        />
      </CourseLayout>
    );
  }

  if (lesson.status === "locked")
    redirect(`${courseHref(courseSlug)}?notice=locked`);

  const { module, progress, next, previous } = lesson;
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

  return (
    <CourseLayout
      course={courseNav(courseSlug, course.title, lesson.outline)}
      currentModuleId={module.slug}
    >
      <NarratorConfig hidden={profile.hideNarrator} />
      <article className="flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Link
            href={courseHref(courseSlug)}
            className="w-fit text-small font-bold text-muted hover:text-text"
          >
            <span aria-hidden="true">← </span>All modules
          </Link>
          <PillTag>Module {lesson.number}</PillTag>
          <LessonHeading>{module.title}</LessonHeading>
          {module.summary && (
            <p className="text-body-lg text-muted">{module.summary}</p>
          )}
        </header>

        {module.slug === FINAL_QUIZ_SLUG ? (
          // The quiz replaces the lesson body and its Continue button: only
          // passing the quiz completes this module.
          <FinalQuiz
            courseSlug={courseSlug}
            {...await getQuizIntro(profile.id, course.id)}
            modulesHref={courseHref(courseSlug)}
            next={
              next
                ? { href: moduleHref(courseSlug, next.slug), title: next.title }
                : null
            }
          />
        ) : (
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
            previous={
              previous
                ? {
                    href: moduleHref(courseSlug, previous.slug),
                    title: previous.title,
                  }
                : null
            }
            nextUnlocked={
              next && next.status !== "locked"
                ? { href: moduleHref(courseSlug, next.slug), title: next.title }
                : null
            }
          >
            <BlockRenderer blocks={blocks} moduleId={module.id} />
          </LessonProgress>
        )}
      </article>
    </CourseLayout>
  );
}

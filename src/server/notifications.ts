import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { LinksSettingSchema } from "@/lib/schemas/site-settings";
import { DEFAULT_COURSE_SLUG, FINAL_QUIZ_SLUG } from "@/lib/course-config";
import { sendEmail } from "./email";

/**
 * Runs an email send after the response has gone, so the volunteer never
 * waits on Resend. Errors are logged, never thrown.
 */
function later(label: string, task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error(`Couldn't send the ${label} email`, error);
    }
  });
}

/** Lesson modules before the final quiz in a course. */
async function lessonModuleCount(courseId: string) {
  const modules = await prisma.module.findMany({
    where: { courseId, isPublished: true },
    select: { slug: true, order: true },
  });
  const quiz = modules.find((m) => m.slug === FINAL_QUIZ_SLUG);
  return quiz
    ? modules.filter((m) => m.order < quiz.order).length
    : modules.length;
}

/** The welcome email, once per volunteer, after onboarding. */
export function sendWelcomeEmail(profileId: string) {
  later("welcome", async () => {
    const [profile, course] = await Promise.all([
      prisma.profile.findUniqueOrThrow({
        where: { id: profileId },
        select: { email: true, firstName: true },
      }),
      prisma.course.findUnique({
        where: { slug: DEFAULT_COURSE_SLUG },
        select: { id: true },
      }),
    ]);
    await sendEmail({
      to: profile.email,
      template: "welcome",
      props: {
        firstName: profile.firstName,
        moduleCount: course ? await lessonModuleCount(course.id) : 10,
      },
      profileId,
      once: true,
      tags: { kind: "welcome" },
    });
  });
}

/** The completion email, once per volunteer, after passing the quiz. */
export function sendCompletionEmail(profileId: string, courseId: string) {
  later("completion", async () => {
    const [profile, certificate, links] = await Promise.all([
      prisma.profile.findUniqueOrThrow({
        where: { id: profileId },
        select: { email: true, firstName: true },
      }),
      prisma.certificate.findUniqueOrThrow({
        where: { profileId_courseId: { profileId, courseId } },
        select: { certificateNumber: true },
      }),
      prisma.siteSetting.findUnique({ where: { key: "links" } }),
    ]);
    const parsedLinks = LinksSettingSchema.safeParse(links?.value);
    await sendEmail({
      to: profile.email,
      template: "completion",
      props: {
        firstName: profile.firstName,
        certificateNumber: certificate.certificateNumber,
        whatsappUrl: parsedLinks.success ? parsedLinks.data.whatsappUrl : null,
      },
      profileId,
      once: true,
      tags: { kind: "completion" },
    });
  });
}

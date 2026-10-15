import type { CourseNav, ModuleStatus } from "./course-nav";
import { volunteerModuleStatus } from "./module-status";

/** The course volunteers land on from /course. */
export const DEFAULT_COURSE_SLUG = "volunteers-onboarding";

export const moduleHref = (courseSlug: string, moduleSlug: string) =>
  `/course/${courseSlug}/${moduleSlug}`;

export const courseHref = (courseSlug: string) => `/course/${courseSlug}`;

/** Modules whose content arrives in Phase 6 (completion). */
export const PLACEHOLDER_MODULE_SLUGS = new Set(["part-of-the-family"]);

/** Sidebar/top bar navigation from a course's modules (ids are slugs). */
export function courseNav(
  courseSlug: string,
  title: string,
  modules: Array<{
    slug: string;
    title: string;
    status: ModuleStatus;
    started: boolean;
  }>,
): CourseNav {
  return {
    title,
    homeHref: courseHref(courseSlug),
    modules: modules.map((m) => ({
      id: m.slug,
      title: m.title,
      status: volunteerModuleStatus(m),
      href: moduleHref(courseSlug, m.slug),
    })),
  };
}

/** The course volunteers land on from /course. */
export const DEFAULT_COURSE_SLUG = "volunteers-onboarding";

export const moduleHref = (courseSlug: string, moduleSlug: string) =>
  `/course/${courseSlug}/${moduleSlug}`;

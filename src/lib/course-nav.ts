/** Course navigation shown in the sidebar, drawer and top bar. */

export type ModuleStatus = "locked" | "in-progress" | "completed";

export type NavModule = {
  id: string;
  title: string;
  status: ModuleStatus;
  href: string;
};

export type CourseNav = {
  title: string;
  /** Where the logo and "All modules" link go (the course dashboard). */
  homeHref: string;
  modules: NavModule[];
};

/** Percentage of modules completed, rounded. */
export function courseProgress(modules: Pick<NavModule, "status">[]) {
  if (modules.length === 0) return 0;
  const completed = modules.filter((m) => m.status === "completed").length;
  return Math.round((completed / modules.length) * 100);
}

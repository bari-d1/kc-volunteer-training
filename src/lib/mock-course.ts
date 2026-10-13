// Hard-coded preview data until the real data model lands in Phase 3.

export type ModuleStatus = "locked" | "in-progress" | "completed";

export type CourseModule = {
  id: string;
  title: string;
  status: ModuleStatus;
};

export type Course = {
  title: string;
  modules: CourseModule[];
};

export const mockCourse: Course = {
  title: "Volunteer Onboarding",
  modules: [
    {
      id: "welcome",
      title: "Welcome to the Spiritual Costco",
      status: "completed",
    },
    { id: "about-kc", title: "About KC", status: "completed" },
    { id: "our-values", title: "Our Values", status: "completed" },
    {
      id: "our-church-family",
      title: "Our Church Family",
      status: "completed",
    },
    { id: "what-we-believe", title: "What We Believe", status: "in-progress" },
    {
      id: "how-were-organised",
      title: "How We're Organised",
      status: "locked",
    },
    { id: "expectations", title: "Expectations", status: "locked" },
    { id: "giving", title: "Giving", status: "locked" },
    { id: "safeguarding", title: "Safeguarding", status: "locked" },
    { id: "branches-and-teams", title: "Branches and Teams", status: "locked" },
    { id: "final-quiz", title: "Final Quiz", status: "locked" },
    {
      id: "part-of-the-family",
      title: "You're Part of the Family",
      status: "locked",
    },
  ],
};

/** Percentage of modules completed, rounded. */
export function courseProgress(modules: CourseModule[]) {
  if (modules.length === 0) return 0;
  const completed = modules.filter((m) => m.status === "completed").length;
  return Math.round((completed / modules.length) * 100);
}

import type { ModuleStatus } from "@/lib/course-nav";
import {
  nextAvailableModule,
  volunteerModuleStatus,
  type VolunteerModuleStatus,
} from "@/lib/module-status";

export type DashboardStatus = VolunteerModuleStatus;

type ModuleInput = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: ModuleStatus;
  progress: { completedAt: Date | null } | null;
};

export type DashboardCard = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string;
  status: DashboardStatus;
};

/**
 * Turns modules (in course order, with unlock status) into what the
 * dashboard shows: per-card status, overall progress and where to go next.
 */
export function buildDashboard(modules: ModuleInput[]) {
  const cards: DashboardCard[] = modules.map((m, index) => ({
    id: m.id,
    slug: m.slug,
    number: index + 1,
    title: m.title,
    summary: m.summary,
    status: volunteerModuleStatus({
      status: m.status,
      started: m.progress !== null,
    }),
  }));

  const total = cards.length;
  const completed = cards.filter((c) => c.status === "completed").length;
  return {
    cards,
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    /** The first incomplete, unlocked module. */
    next: nextAvailableModule(cards),
    started: cards.some(
      (c) => c.status === "completed" || c.status === "in-progress",
    ),
    allComplete: total > 0 && completed === total,
    /** The final module ("You're Part of the Family"). */
    completionModule: cards.at(-1) ?? null,
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;

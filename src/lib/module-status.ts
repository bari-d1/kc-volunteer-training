import type { ModuleStatus } from "./course-nav";

/**
 * What a volunteer sees for a module. The unlock rule (src/server/unlock.ts)
 * gives locked / in-progress / completed; an unlocked module they haven't
 * opened yet is "available".
 */
export type VolunteerModuleStatus =
  "locked" | "available" | "in-progress" | "completed";

export function volunteerModuleStatus(module: {
  status: ModuleStatus;
  /** Whether a ModuleProgress row exists (they've opened it). */
  started: boolean;
}): VolunteerModuleStatus {
  if (module.status === "completed") return "completed";
  if (module.status === "locked") return "locked";
  return module.started ? "in-progress" : "available";
}

/** The first module that's unlocked but not yet completed, in course order. */
export function nextAvailableModule<
  M extends { status: VolunteerModuleStatus },
>(modules: readonly M[]): M | null {
  return (
    modules.find(
      (m) => m.status === "in-progress" || m.status === "available",
    ) ?? null
  );
}

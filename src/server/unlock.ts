import "server-only";

export type ModuleStatus = "locked" | "in-progress" | "completed";

export type ModuleState<M> = M & {
  status: ModuleStatus;
  /** The module that must be completed first, when locked. */
  unlockedBy: M | null;
};

/**
 * Applies the unlock rule to a course's published modules (any order in,
 * course order out): the first module is open, and each later module is
 * locked until the one before it is completed.
 */
export function computeModuleStates<M extends { id: string; order: number }>(
  modules: M[],
  completedModuleIds: ReadonlySet<string>,
): ModuleState<M>[] {
  const ordered = [...modules].sort((a, b) => a.order - b.order);
  return ordered.map((module, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    const unlocked = !previous || completedModuleIds.has(previous.id);
    const status: ModuleStatus = completedModuleIds.has(module.id)
      ? "completed"
      : unlocked
        ? "in-progress"
        : "locked";
    // A completed module stays open even if an earlier one was reset.
    return {
      ...module,
      status,
      unlockedBy: status === "locked" ? previous : null,
    };
  });
}

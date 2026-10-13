"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ModuleList } from "@/components/blocks/module-list";
import { useSidebarCollapsed } from "@/components/blocks/use-sidebar-collapsed";
import { cn } from "@/lib/cn";
import type { NavModule } from "@/lib/course-nav";

export type ModuleSidebarProps = {
  modules: NavModule[];
  currentModuleId: string;
  progress: number;
  className?: string;
};

export function ModuleSidebar({
  modules,
  currentModuleId,
  progress,
  className,
}: ModuleSidebarProps) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  // Only animate user toggles, not the stored state restored on load.
  const [animate, setAnimate] = useState(false);
  const transition = { duration: animate ? 0.2 : 0, ease: "easeOut" } as const;

  return (
    <motion.aside
      aria-label="Course modules"
      initial={false}
      animate={{ width: collapsed ? 80 : 320 }}
      transition={transition}
      className={cn(
        "flex shrink-0 flex-col gap-6 overflow-x-hidden border-r border-surface-2 bg-bg py-6",
        collapsed ? "px-3" : "px-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-4",
          collapsed ? "flex-col" : "justify-between",
        )}
      >
        <div className="flex items-center gap-3">
          <ProgressRing
            value={progress}
            label="Course progress"
            size={collapsed ? 48 : 56}
            strokeWidth={5}
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-label text-muted">Course progress</span>
              <span className="text-small font-bold">
                {modules.filter((m) => m.status === "completed").length} of{" "}
                {modules.length} modules
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setAnimate(true);
            setCollapsed(!collapsed);
          }}
          aria-expanded={!collapsed}
          aria-controls="module-sidebar-list"
          aria-label={collapsed ? "Expand module list" : "Collapse module list"}
          className="grid size-10 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <motion.svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={transition}
          >
            <path d="M10 3L5 8l5 5" />
          </motion.svg>
        </button>
      </div>
      <nav id="module-sidebar-list" aria-label="Modules">
        <ModuleList
          modules={modules}
          currentModuleId={currentModuleId}
          collapsed={collapsed}
        />
      </nav>
    </motion.aside>
  );
}

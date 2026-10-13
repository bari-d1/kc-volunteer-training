"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModuleList } from "@/components/blocks/module-list";
import { useReturnFocus } from "@/components/ui/use-return-focus";
import type { NavModule } from "@/lib/course-nav";

export type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: NavModule[];
  currentModuleId: string;
  progress: number;
};

/** Slide-in module list for small screens. Radix handles focus and Escape. */
export function MobileDrawer({
  open,
  onOpenChange,
  modules,
  currentModuleId,
  progress,
}: MobileDrawerProps) {
  // The menu button lives in TopBar, outside this Dialog.Root.
  const returnFocus = useReturnFocus();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/* forceMount hands mounting to AnimatePresence so exits can animate. */}
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/75 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              id="mobile-module-drawer"
              {...returnFocus}
              aria-describedby={undefined}
            >
              <motion.div
                className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto bg-surface p-4 shadow-card focus:outline-none lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <Dialog.Title className="text-h3">Modules</Dialog.Title>
                  <Dialog.Close
                    aria-label="Close modules"
                    className="grid size-10 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </Dialog.Close>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-label text-muted">
                      Course progress
                    </span>
                    <span className="text-small font-bold tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <ProgressBar value={progress} label="Course progress" />
                </div>
                <nav aria-label="Modules">
                  <ModuleList
                    modules={modules}
                    currentModuleId={currentModuleId}
                    onNavigate={() => onOpenChange(false)}
                  />
                </nav>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

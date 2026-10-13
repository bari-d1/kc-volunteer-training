"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModuleList } from "@/components/blocks/module-list";
import { useReturnFocus } from "@/components/ui/use-return-focus";
import type { CourseModule } from "@/lib/mock-course";

export type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: CourseModule[];
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
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in motion-reduce:animate-none lg:hidden" />
        <Dialog.Content
          id="mobile-module-drawer"
          {...returnFocus}
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto bg-surface p-4 shadow-card focus:outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in motion-reduce:animate-none lg:hidden"
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
              <span className="text-label text-muted">Course progress</span>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

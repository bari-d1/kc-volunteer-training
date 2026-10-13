"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional element that opens the modal; focus returns to it on close. */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Actions row, e.g. confirm and cancel buttons. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Accessible dialog built on Radix: traps focus, closes on Escape or overlay
 * click, returns focus to the trigger and locks page scroll while open.
 */
export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <Dialog.Content
          // Radix warns without a description; opt out explicitly when absent.
          {...(!description && { "aria-describedby": undefined })}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface p-6 shadow-card focus:outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-h3">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-m-2 grid size-10 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-text"
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
          {description && (
            <Dialog.Description className="text-body text-muted">
              {description}
            </Dialog.Description>
          )}
          {children}
          {footer && (
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Wrap a footer button to close the modal on click. */
export const ModalClose = Dialog.Close;

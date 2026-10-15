"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Asks before a destructive action. Stays open while it runs, so a slow
 * delete can't be clicked twice, and closes when it's done.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: {
  /** The button that opens it. */
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Return false to keep the dialog open (e.g. it failed and showed a toast). */
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !pending && setOpen(next)}
      trigger={trigger}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            size="sm"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result !== false) setOpen(false);
              })
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

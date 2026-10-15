"use client";

import { useId, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

/**
 * An on/off setting with a label and hint. Switches straight away, saves in
 * the background, and switches back with a toast if saving fails.
 */
export function SettingSwitch({
  label,
  hint,
  initialOn,
  save,
}: {
  label: string;
  hint: string;
  initialOn: boolean;
  save: (on: boolean) => Promise<{ ok: boolean }>;
}) {
  const id = useId();
  const [on, setOn] = useState(initialOn);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const toggle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await save(next).catch(() => ({ ok: false }));
      if (!result.ok) {
        setOn(!next);
        toast({
          variant: "error",
          title: "We couldn't save that",
          description: "Please try again.",
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <span id={`${id}-label`} className="text-body font-bold">
          {label}
        </span>
        <span id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        onClick={toggle}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-pill border-2 transition-colors",
          on ? "border-lime bg-lime" : "border-surface-2 bg-surface-2",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 size-6 rounded-pill transition-[left] motion-reduce:transition-none",
            on ? "left-[26px] bg-ink" : "left-0.5 bg-muted",
          )}
        />
      </button>
    </div>
  );
}

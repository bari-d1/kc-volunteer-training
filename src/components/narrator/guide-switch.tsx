"use client";

import { useState, useTransition } from "react";
import { setGuideHidden } from "@/app/actions/narrator";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

/** /account switch for the narrator guide (Profile.hideNarrator), optimistic. */
export function GuideSwitch({ initialHidden }: { initialHidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const on = !hidden;

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    startTransition(async () => {
      const result = await setGuideHidden(next).catch(() => ({
        ok: false as const,
      }));
      if (!result.ok) {
        setHidden(!next);
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
        <span id="guide-switch-label" className="text-body font-bold">
          Show the guide
        </span>
        <span id="guide-switch-hint" className="text-small text-muted">
          The friendly guide that talks you through each module. When it&apos;s
          off, its messages appear as plain notes instead.
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="guide-switch-label"
        aria-describedby="guide-switch-hint"
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

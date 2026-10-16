"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const WIDTHS = {
  phone: { label: "Phone", className: "max-w-[390px]" },
  desktop: { label: "Desktop", className: "max-w-[808px]" },
} as const;

/** Shows the lesson at phone or desktop width. */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState<keyof typeof WIDTHS>("desktop");
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        role="group"
        aria-label="Preview width"
        className="flex rounded-pill border border-surface-2 p-1"
      >
        {(Object.keys(WIDTHS) as Array<keyof typeof WIDTHS>).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={width === key}
            onClick={() => setWidth(key)}
            className={cn(
              "rounded-pill px-4 py-1.5 text-small font-bold",
              width === key ? "bg-lime text-ink" : "text-muted hover:text-text",
            )}
          >
            {WIDTHS[key].label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "w-full rounded-lg border border-surface-2 px-gutter py-10 transition-[max-width] motion-reduce:transition-none",
          WIDTHS[width].className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

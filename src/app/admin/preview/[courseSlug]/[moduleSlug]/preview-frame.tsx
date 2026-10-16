"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const WIDTHS = { phone: "Phone", desktop: "Desktop" } as const;

/**
 * Shows the lesson at desktop width, or at phone width in an iframe of the
 * same page (`frameSrc`). The iframe matters: blocks lay out by the
 * viewport's width (media queries), so a narrow box on a wide screen would
 * still get the desktop layout.
 */
export function PreviewFrame({
  frameSrc,
  children,
}: {
  frameSrc: string;
  children: ReactNode;
}) {
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
            {WIDTHS[key]}
          </button>
        ))}
      </div>
      {width === "phone" ? (
        <iframe
          src={frameSrc}
          title="The module at phone width"
          className="h-[min(844px,80vh)] w-full max-w-[390px] rounded-lg border border-surface-2 bg-bg"
        />
      ) : (
        // On a real phone the screen is the frame: no border or padding.
        <div className="w-full max-w-[808px] sm:rounded-lg sm:border sm:border-surface-2 sm:px-gutter sm:py-10">
          {children}
        </div>
      )}
    </div>
  );
}

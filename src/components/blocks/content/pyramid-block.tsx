"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

/**
 * Narrow at the top, wide at the bottom. Levels with a description can be
 * tapped to read it; without any, it's a plain diagram.
 */
export function PyramidBlock({ levels }: BlockProps<"PYRAMID">) {
  const detailId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const width = (index: number) =>
    levels.length === 1 ? 100 : 40 + (60 * index) / (levels.length - 1);
  const level = selected === null ? null : levels[selected];
  const interactive = levels.some((item) => item.body);
  const levelClasses = (index: number) =>
    cn(
      "flex min-h-12 items-center justify-center rounded-md px-4 py-3 text-center text-small font-extrabold uppercase",
      index === 0 ? "bg-lime text-ink" : "bg-surface-2 text-text",
    );

  if (!interactive) {
    return (
      <ol className="flex flex-col items-center gap-2">
        {levels.map((item, index) => (
          <li
            key={index}
            style={{ width: `${width(index)}%` }}
            className={levelClasses(index)}
          >
            {item.title}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col items-center gap-2">
        {levels.map((item, index) => {
          const active = index === selected;
          return (
            <li key={index} className="flex w-full justify-center">
              <button
                type="button"
                aria-expanded={active}
                aria-controls={detailId}
                disabled={!item.body}
                onClick={() => setSelected(active ? null : index)}
                style={{ width: `${width(index)}%` }}
                className={cn(
                  "min-h-12 rounded-md px-4 py-3 text-center text-small font-extrabold uppercase transition-colors disabled:cursor-default",
                  index === 0
                    ? "bg-lime text-ink"
                    : "bg-surface-2 text-text enabled:hover:bg-surface",
                  active && "ring-2 ring-lime ring-offset-2 ring-offset-bg",
                )}
              >
                {item.title}
              </button>
            </li>
          );
        })}
      </ol>
      <div id={detailId} aria-live="polite" className="min-h-6">
        {level?.body ? (
          <div className="flex flex-col gap-1 rounded-lg bg-surface p-5">
            <span className="text-label text-lime">{level.title}</span>
            <span className="text-body">{level.body}</span>
          </div>
        ) : (
          <p className="text-center text-small text-muted">
            Tap a level to learn more.
          </p>
        )}
      </div>
    </div>
  );
}

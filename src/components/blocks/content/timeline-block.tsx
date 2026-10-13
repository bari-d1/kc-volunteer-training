"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

/**
 * Vertical list on small screens; on desktop, a horizontal line of year
 * markers (a tab list) that reveal each event's details.
 */
export function TimelineBlock({ events }: BlockProps<"TIMELINE">) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const markers = useRef<Array<HTMLButtonElement | null>>([]);
  const event = events[selected];

  const select = (index: number) => {
    setSelected(index);
    markers.current[index]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const last = events.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: Math.min(selected + 1, last),
      ArrowLeft: Math.max(selected - 1, 0),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      select(moves[e.key]);
    }
  };

  return (
    <div>
      {/* Mobile: everything visible in a vertical line. */}
      <ol className="flex flex-col border-l-2 border-surface-2 md:hidden">
        {events.map((item, index) => (
          <li
            key={index}
            className="relative flex flex-col gap-1 pb-8 pl-6 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[7px] size-3 rounded-pill bg-lime"
            />
            <span className="text-h3 font-extrabold text-lime">
              {item.year}
            </span>
            <span className="text-body-lg font-bold">{item.title}</span>
            {item.body && (
              <span className="text-body text-muted">{item.body}</span>
            )}
          </li>
        ))}
      </ol>

      {/* Desktop: pick a year to reveal it. */}
      <div className="hidden flex-col gap-8 md:flex">
        <div
          role="tablist"
          aria-label="Timeline"
          onKeyDown={onKeyDown}
          className="relative flex justify-between"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-[11px] h-0.5 bg-surface-2"
          />
          {events.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={index}
                ref={(el) => {
                  markers.current[index] = el;
                }}
                id={`${baseId}-marker-${index}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${baseId}-detail`}
                tabIndex={active ? 0 : -1}
                onClick={() => select(index)}
                className="group relative flex flex-col items-center gap-3 rounded-sm px-1"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-6 rounded-pill border-4 border-bg transition-colors",
                    active ? "bg-lime" : "bg-surface-2 group-hover:bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "text-body font-extrabold tabular-nums",
                    active ? "text-lime" : "text-muted group-hover:text-text",
                  )}
                >
                  {item.year}
                </span>
              </button>
            );
          })}
        </div>
        <div
          id={`${baseId}-detail`}
          role="tabpanel"
          aria-labelledby={`${baseId}-marker-${selected}`}
          aria-live="polite"
          className="flex min-h-32 flex-col gap-2 rounded-lg bg-surface p-6"
        >
          <span className="text-label text-lime">{event.year}</span>
          <span className="text-h3">{event.title}</span>
          {event.body && (
            <span className="text-body text-muted">{event.body}</span>
          )}
        </div>
      </div>
    </div>
  );
}

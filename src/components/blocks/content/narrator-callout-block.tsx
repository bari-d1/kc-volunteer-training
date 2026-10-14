"use client";

import { useNarrator } from "@/components/narrator/narrator-context";
import { useInViewOnce } from "@/components/narrator/use-in-view-once";
import type { BlockProps } from "../block-props";

/** Static stand-in used inline when there's no narrator dock (e.g. previews). */
function MascotPlaceholder() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="size-16 shrink-0">
      <circle cx="32" cy="32" r="32" className="fill-lime" />
      <circle cx="23" cy="27" r="4" fill="#191919" />
      <circle cx="41" cy="27" r="4" fill="#191919" />
      <path
        d="M22 40c3 4 7 6 10 6s7-2 10-6"
        fill="none"
        stroke="#191919"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * In the course the narrator says this text (once per visit) when the block
 * scrolls into view, so nothing renders in the page flow. If the volunteer
 * hid the guide it becomes a plain note so no content is lost, and outside
 * the course (previews) it's an inline speech-bubble card.
 */
export function NarratorCalloutBlock({
  state,
  text,
  blockId,
}: BlockProps<"NARRATOR_CALLOUT">) {
  const { present, available, hidden, say } = useNarrator();
  const ref = useInViewOnce<HTMLDivElement>(
    () => say(text, state, { key: `callout:${blockId}`, once: "visit" }),
    available,
    // Callouts often open a lesson, so count them as soon as they're visible.
    { rootMargin: "0px" },
  );

  if (present && hidden) {
    return (
      <p
        data-narrator-state={state}
        data-narrator-note=""
        className="rounded-md border-l-4 border-lime bg-surface px-5 py-4 text-body text-text"
      >
        {text}
      </p>
    );
  }

  if (present) {
    return (
      <div
        ref={ref}
        data-narrator-state={state}
        data-narrator-trigger=""
        className="h-px"
      />
    );
  }

  return (
    <aside
      aria-label="Your guide says"
      data-narrator-state={state}
      className="flex items-end gap-4"
    >
      <MascotPlaceholder />
      <p className="relative flex-1 rounded-lg rounded-bl-sm bg-surface-2 px-5 py-4 text-body-lg text-text">
        <span
          aria-hidden="true"
          className="absolute bottom-0 -left-2 size-4 bg-surface-2 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
        />
        {text}
      </p>
    </aside>
  );
}

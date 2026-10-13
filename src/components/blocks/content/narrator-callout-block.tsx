import type { BlockProps } from "../block-props";

/** Static stand-in for the animated narrator (Phase 5). */
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

export function NarratorCalloutBlock({
  state,
  text,
}: BlockProps<"NARRATOR_CALLOUT">) {
  return (
    <aside
      aria-label="Your guide says"
      data-narrator-state={state}
      className="flex items-end gap-4"
    >
      <MascotPlaceholder />
      <p className="relative flex-1 rounded-lg rounded-bl-sm bg-surface-2 px-5 py-4 text-body-lg text-text">
        {/* Speech-bubble tail pointing at the mascot. */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 -left-2 size-4 bg-surface-2 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
        />
        {text}
      </p>
    </aside>
  );
}

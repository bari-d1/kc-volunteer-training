"use client";

import { useNarrator } from "./narrator-context";

/** In the top bar: brings the guide back after "Hide guide". */
export function ShowGuideButton() {
  const { present, hidden, setHidden } = useNarrator();
  if (!present || !hidden) return null;
  return (
    <button
      type="button"
      onClick={() => setHidden(false)}
      className="shrink-0 rounded-pill border-2 border-surface-2 px-3 py-1.5 text-small font-bold text-muted transition-colors hover:border-lime hover:text-text"
    >
      Show guide
    </button>
  );
}

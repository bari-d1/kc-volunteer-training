"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useNarrator } from "./narrator-context";
import { INTERACTIVE_HINTS, type HintedBlockType } from "./narrator-hints";

/** A hint fires after the block has been on screen this long. */
export const HINT_DWELL_MS = 1000;

/**
 * Points the narrator at an interactive block the first time it's seen.
 * Hints are low priority: if something else is being said, the hint waits
 * and tries again once the narrator is quiet, as long as the block is
 * still on screen.
 */
export function NarratorHint({
  blockId,
  type,
  children,
}: {
  blockId: string;
  type: HintedBlockType;
  children: ReactNode;
}) {
  const { available, speaking, say } = useNarrator();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const done = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });

  // Try after a short dwell; stop for good once the hint has been said.
  const attempt = useRef(() => {});
  useEffect(() => {
    attempt.current = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (done.current || !visible.current) return;
        done.current = sayRef.current(INTERACTIVE_HINTS[type], "point", {
          key: `hint:${blockId}`,
          once: "visit",
          priority: "low",
        });
      }, HINT_DWELL_MS);
    };
  }, [blockId, type]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !available) return;
    const observer = new IntersectionObserver(
      (entries) => {
        visible.current = entries.some((e) => e.isIntersecting);
        if (visible.current && !done.current) attempt.current();
        else if (timer.current) clearTimeout(timer.current);
      },
      { rootMargin: "-20% 0px -30% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [available]);

  // When the narrator goes quiet, a waiting hint gets its turn.
  useEffect(() => {
    if (!speaking && visible.current && !done.current) attempt.current();
  }, [speaking]);

  return <div ref={ref}>{children}</div>;
}

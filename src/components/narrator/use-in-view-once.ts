"use client";

import { useEffect, useRef } from "react";

/**
 * Calls onFirstView when the element comes into view, until it returns
 * something other than false (so a skipped hint can try again later).
 */
export function useInViewOnce<T extends Element>(
  onFirstView: () => boolean | void,
  enabled = true,
  options: {
    /** Default: the middle part of the screen. "0px" counts any visibility. */
    rootMargin?: string;
    /** Only fire after the element has stayed in view this long. */
    dwellMs?: number;
  } = {},
) {
  const { rootMargin = "-20% 0px -30% 0px", dwellMs = 0 } = options;
  const ref = useRef<T>(null);
  const callback = useRef(onFirstView);
  useEffect(() => {
    callback.current = onFirstView;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (callback.current() !== false) observer.disconnect();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (timer) clearTimeout(timer);
        timer = null;
        if (!visible) return;
        if (dwellMs > 0) timer = setTimeout(fire, dwellMs);
        else fire();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled, rootMargin, dwellMs]);

  return ref;
}

"use client";

import { useEffect, useRef } from "react";

// Module state survives client navigations but resets on a full page load.
let hasLoaded = false;

/**
 * The lesson's h1. After an in-app navigation to a new module it takes
 * focus, so screen readers start at the new heading instead of wherever the
 * old page left focus. The first page load is left alone.
 */
export function LessonHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (hasLoaded) ref.current?.focus();
    hasLoaded = true;
  }, []);

  return (
    <h1 ref={ref} tabIndex={-1} className="text-display focus:outline-none">
      {children}
    </h1>
  );
}

/** Test helper: forget that a page has loaded. */
export function resetLessonHeadingForTests() {
  hasLoaded = false;
}

"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * App-wide motion settings. With prefers-reduced-motion, every animation is
 * skipped so content appears instantly in its final state (no fades either).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user" skipAnimations={reduced === true}>
      {children}
    </MotionConfig>
  );
}

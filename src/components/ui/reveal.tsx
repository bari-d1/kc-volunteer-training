"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export type RevealProps = HTMLMotionProps<"div"> & {
  /** Seconds. Keep small so nothing waits on animation to be read. */
  delay?: number;
};

/** Fades and lifts content slightly the first time it scrolls into view. */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  return (
    <motion.div
      data-reveal=""
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

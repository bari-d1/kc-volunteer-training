"use client";

import { motion, type Variants } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

/** Seconds between each level lighting up. */
const STEP = 0.45;

const cascade: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: STEP, delayChildren: 0.2 } },
};
const dimmed: Variants = {
  hidden: { opacity: 0.25 },
  shown: { opacity: 1, transition: { duration: 0.3 } },
};
// A lime ring that pulses once as each level lights up (two shadows, so
// the ring sits clear of the lime top level).
const RING_OFF = "0 0 0 0px #191919, 0 0 0 0px rgba(217, 255, 61, 0)";
const RING_ON = "0 0 0 2px #191919, 0 0 0 5px rgba(217, 255, 61, 0.9)";
const pulse: Variants = {
  hidden: { scale: 0.96, boxShadow: RING_OFF },
  shown: {
    scale: [0.96, 1.04, 1],
    boxShadow: [RING_OFF, RING_ON, RING_OFF],
    transition: { duration: 0.7, times: [0, 0.35, 1], ease: "easeOut" },
  },
};

function DownArrow() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      className="text-lime"
    >
      <path d="M6 1h4v7h4l-6 7-6-7h4z" fill="currentColor" />
    </svg>
  );
}

/**
 * Narrow at the top, wide at the bottom. Levels with a description can be
 * tapped to read it; without any, it's a diagram that lights up level by
 * level, top to bottom, when it scrolls into view (instantly with reduced
 * motion).
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
      <motion.ol
        variants={cascade}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.6 }}
        className="flex flex-col items-center gap-1"
      >
        {levels.map((item, index) => (
          <motion.li
            key={index}
            variants={dimmed}
            className="flex w-full flex-col items-center gap-1"
          >
            {index > 0 && <DownArrow />}
            <motion.div
              variants={pulse}
              style={{ width: `${width(index)}%` }}
              className={levelClasses(index)}
            >
              {item.title}
            </motion.div>
          </motion.li>
        ))}
      </motion.ol>
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

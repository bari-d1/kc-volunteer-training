"use client";

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const COLOURS = ["#D9FF3D", "#FF5FC8", "#FF7A1A", "#33D6F5", "#FFFFFF"];
const PIECES = 48;

type Piece = {
  left: number;
  colour: string;
  size: number;
  round: boolean;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
};

/** Small seeded PRNG (mulberry32), so the burst is the same every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(2015);
const PIECE_LIST: Piece[] = Array.from({ length: PIECES }, (_, i) => ({
  left: random() * 100,
  colour: COLOURS[i % COLOURS.length],
  size: 6 + random() * 6,
  round: random() < 0.3,
  delay: random() * 0.6,
  duration: 2.4 + random() * 1.6,
  drift: (random() - 0.5) * 120,
  spin: (random() - 0.5) * 720,
}));

const noopSubscribe = () => () => {};

/**
 * A one-off burst of confetti over its (relative) parent. Decorative only,
 * and skipped entirely when the visitor prefers reduced motion.
 */
export function Confetti() {
  const reduced = useReducedMotion();
  // Nothing on the server or during hydration: the motion preference is
  // only known in the browser, so rendering it there avoids a mismatch.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!hydrated || reduced) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="confetti"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {PIECE_LIST.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? 999 : 2,
            backgroundColor: p.colour,
          }}
          initial={{ y: -24, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: 480, x: p.drift, rotate: p.spin, opacity: 0 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

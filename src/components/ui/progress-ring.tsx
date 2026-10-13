"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type ProgressRingProps = {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Overall progress". */
  label: string;
  /** Diameter in px. */
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function ProgressRing({
  value,
  max = 100,
  label,
  size = 96,
  strokeWidth = 8,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={`${percent}%`}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-2"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="stroke-lime"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute font-extrabold tabular-nums"
        style={{ fontSize: size * 0.22 }}
      >
        {percent}%
      </span>
    </div>
  );
}

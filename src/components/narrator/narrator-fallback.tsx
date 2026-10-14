import { cn } from "@/lib/cn";
import type { NarratorState } from "./narrator-states";

const stateAnimation: Record<NarratorState, string> = {
  idle: "animate-narrator-float",
  wave: "animate-narrator-wave",
  point: "animate-narrator-point",
  think: "animate-narrator-think",
  celebrate: "animate-narrator-bounce",
  encourage: "animate-narrator-nod",
};

/**
 * Lightweight SVG mascot (well under 3 KB) used when the Rive animation
 * can't or shouldn't load. With reduced motion it holds a static pose.
 */
export function NarratorFallback({
  state,
  talking,
  size,
  reducedMotion,
}: {
  state: NarratorState;
  talking: boolean;
  size: number;
  reducedMotion: boolean;
}) {
  const animate = !reducedMotion;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      data-narrator-fallback=""
      data-narrator-state={state}
      className={cn(
        "shrink-0 origin-bottom overflow-visible",
        animate && stateAnimation[state],
      )}
    >
      <circle
        cx="50"
        cy="52"
        r="42"
        fill="#D9FF3D"
        stroke="#191919"
        strokeWidth="5"
      />
      {state === "think" ? (
        <>
          <path
            d="M31 46h10M59 46h10"
            stroke="#191919"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="36" cy="46" r="6" fill="#191919" />
          <circle cx="64" cy="46" r="6" fill="#191919" />
          <circle cx="38" cy="44" r="2" fill="#fff" />
          <circle cx="66" cy="44" r="2" fill="#fff" />
        </>
      )}
      <circle cx="26" cy="60" r="5" fill="#FF9AA2" opacity=".7" />
      <circle cx="74" cy="60" r="5" fill="#FF9AA2" opacity=".7" />
      {talking ? (
        <ellipse
          cx="50"
          cy="66"
          rx="9"
          ry="7"
          fill="#191919"
          className={cn(
            "origin-center [transform-box:fill-box]",
            animate && "animate-narrator-talk",
          )}
        />
      ) : (
        <path
          d={state === "celebrate" ? "M37 62q13 16 26 0z" : "M38 63q12 10 24 0"}
          fill={state === "celebrate" ? "#191919" : "none"}
          stroke="#191919"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

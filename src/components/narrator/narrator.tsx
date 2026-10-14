"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { NarratorFallback } from "./narrator-fallback";
import type { NarratorState } from "./narrator-states";
import { useNarratorPreferences } from "./use-narrator-preferences";

// The Rive runtime (~2 MB of WebAssembly) only loads when it's actually used.
const NarratorRive = dynamic(() => import("./narrator-rive"), { ssr: false });

export type NarratorProps = {
  state?: NarratorState;
  /** Mouth animates while the speech bubble types. */
  talking?: boolean;
  /** Width and height in px. */
  size?: number;
  /** Always use the SVG fallback (e.g. for testing). */
  forceFallback?: boolean;
  /** Override the visitor's reduced-motion preference (e.g. for previews). */
  reducedMotion?: boolean;
};

/**
 * The KC narrator. Uses the Rive animation, or the SVG fallback when the
 * .riv file fails to load, the visitor prefers reduced motion, or they're
 * on a slow connection or have data saver on.
 */
export function Narrator({
  state = "idle",
  talking = false,
  size = 96,
  forceFallback = false,
  reducedMotion,
}: NarratorProps) {
  const preferences = useNarratorPreferences();
  const reduced = reducedMotion ?? preferences.reducedMotion;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const useRive =
    !forceFallback && !failed && !reduced && !preferences.slowConnection;

  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      data-narrator-mode={useRive && loaded ? "rive" : "fallback"}
    >
      {/* The fallback shows until Rive has loaded, so there's never a gap. */}
      {(!useRive || !loaded) && (
        <span className="absolute inset-0">
          <NarratorFallback
            state={state}
            talking={talking}
            size={size}
            reducedMotion={reduced || useRive}
          />
        </span>
      )}
      {useRive && (
        <span
          className={loaded ? "absolute inset-0" : "absolute inset-0 opacity-0"}
        >
          <NarratorRive
            state={state}
            talking={talking}
            size={size}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </span>
      )}
    </span>
  );
}

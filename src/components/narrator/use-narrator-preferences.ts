"use client";

import { useSyncExternalStore } from "react";

type Connection = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const connection = () =>
  typeof navigator !== "undefined"
    ? (navigator as Navigator & { connection?: Connection }).connection
    : undefined;

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(REDUCED);
  media?.addEventListener?.("change", onChange);
  connection()?.addEventListener?.("change", onChange);
  return () => {
    media?.removeEventListener?.("change", onChange);
    connection()?.removeEventListener?.("change", onChange);
  };
}

/** Data saver on, or a 2G-class connection. */
export function isSlowConnection(c: Connection | undefined = connection()) {
  return Boolean(
    c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g",
  );
}

/** Encoded as a string so useSyncExternalStore can compare snapshots. */
function snapshot() {
  const reduced = window.matchMedia?.(REDUCED).matches ?? false;
  return `${reduced ? 1 : 0}${isSlowConnection() ? 1 : 0}`;
}

/**
 * The visitor's motion and data preferences. The server (and first render)
 * assumes the lightest option, the static fallback, until the browser says
 * otherwise, so nothing heavy loads before we know it's welcome.
 */
export function useNarratorPreferences() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "11");
  return { reducedMotion: value[0] === "1", slowConnection: value[1] === "1" };
}

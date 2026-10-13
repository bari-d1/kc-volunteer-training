"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "kc:sidebar-collapsed";
const listeners = new Set<() => void>();
// In-memory copy so toggling still works when storage is unavailable.
let cached: boolean | null = null;

function readStorage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSnapshot() {
  if (cached === null) cached = readStorage();
  return cached;
}

function getServerSnapshot() {
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Desktop sidebar collapsed state, remembered in localStorage. */
export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCollapsed = useCallback((value: boolean) => {
    cached = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Storage blocked (private mode, disabled site data): keep in memory.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [collapsed, setCollapsed] as const;
}

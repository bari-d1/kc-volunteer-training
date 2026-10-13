"use client";

import { useRef } from "react";

/**
 * Radix Dialog only returns focus to its own Trigger. For dialogs opened from
 * elsewhere, remember what had focus on open and restore it on close.
 */
export function useReturnFocus() {
  const previous = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      previous.current = document.activeElement as HTMLElement | null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (!previous.current?.isConnected) return;
      event.preventDefault();
      previous.current.focus();
      previous.current = null;
    },
  };
}

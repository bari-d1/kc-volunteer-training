"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/lib/auth-actions";

const itemClasses =
  "flex w-full items-center rounded-md px-3 py-2.5 text-left text-body font-bold transition-colors hover:bg-surface-2 focus-visible:bg-surface-2";

/**
 * The person button in the top bar: opens a small menu with the account
 * page and Sign out. Closes on Escape, an outside click, or choosing.
 */
export function AccountMenu() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Account"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        className="grid size-10 place-items-center rounded-pill border-2 border-surface-2 transition-colors hover:border-muted"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="10" cy="7" r="3.5" />
          <path d="M3.5 17.5c1-3.2 3.5-5 6.5-5s5.5 1.8 6.5 5" />
        </svg>
      </button>
      {open && (
        <div
          id={`${id}-menu`}
          className="absolute top-12 right-0 z-50 flex w-52 flex-col gap-1 rounded-lg border border-surface-2 bg-surface p-2 shadow-card"
        >
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className={itemClasses}
          >
            Your account
          </Link>
          <form action={signOut}>
            <button type="submit" className={`${itemClasses} text-danger`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

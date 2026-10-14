"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Narrator } from "./narrator";
import type { NarratorState } from "./narrator-states";
import { SpeechBubble } from "./speech-bubble";

export type NarratorDockProps = {
  /** No text: the dock shows just the mascot. */
  text?: string;
  /** Changes for each new message so typing restarts even for repeated text. */
  messageId?: number;
  /** Paused auto-hide while the visitor hovers or focuses the dock. */
  onHoldChange?: (held: boolean) => void;
  /** Close the current message. */
  onDismiss?: () => void;
  /** Re-scan for data-narrator-avoid elements when this changes (e.g. pathname). */
  scanKey?: string;
  state?: NarratorState;
  typing?: boolean;
  forceFallback?: boolean;
  reducedMotion?: boolean;
  /** Start collapsed to just the mascot. */
  defaultCollapsed?: boolean;
};

/** Elements marked with this attribute (e.g. the Continue footer) are never covered. */
export const NARRATOR_AVOID_ATTR = "data-narrator-avoid";

/**
 * The narrator docked to the screen: a card in the bottom-right corner on
 * desktop, a compact bar along the bottom on mobile. It collapses to just
 * the mascot, and collapses itself while anything marked
 * data-narrator-avoid (the Continue button) is on screen.
 */
export function NarratorDock({
  text,
  messageId,
  onHoldChange,
  onDismiss,
  scanKey,
  state = "idle",
  typing = true,
  forceFallback,
  reducedMotion,
  defaultCollapsed = false,
}: NarratorDockProps) {
  const bubbleId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [avoiding, setAvoiding] = useState(false);
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll(`[${NARRATOR_AVOID_ATTR}]`);
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setAvoiding(visible.size > 0);
    });
    targets.forEach((t) => observer.observe(t));
    return () => {
      observer.disconnect();
      setAvoiding(false);
    };
  }, [scanKey]);

  const minimised = collapsed || avoiding;
  const showBubble = !minimised && Boolean(text);

  return (
    <>
      {/* Space at the end of the page so the dock never sits over the last content. */}
      <div aria-hidden="true" className="h-28 lg:h-40" />
      <aside
        aria-label="Your guide"
        onMouseEnter={() => onHoldChange?.(true)}
        onMouseLeave={() => onHoldChange?.(false)}
        onFocus={() => onHoldChange?.(true)}
        onBlur={() => onHoldChange?.(false)}
        className={cn(
          "fixed z-30 flex items-end gap-3 transition-[opacity,transform] motion-reduce:transition-none",
          // Mobile: compact bar above the bottom edge. Desktop: corner card.
          "inset-x-3 bottom-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm",
          minimised && "inset-x-auto right-3 lg:right-6",
        )}
      >
        {showBubble && text && (
          <div id={bubbleId} className="relative min-w-0 flex-1">
            <SpeechBubble
              key={messageId}
              text={text}
              typing={typing}
              reducedMotion={reducedMotion}
              onTalkingChange={setTalking}
              tail="bottom"
              className="max-h-40 overflow-y-auto pr-9 text-small lg:text-body"
            />
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Close message"
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-pill text-muted hover:bg-surface-2 hover:text-text"
              >
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={showBubble}
          aria-controls={showBubble ? bubbleId : undefined}
          aria-label={
            minimised
              ? "Show your guide's message"
              : "Hide your guide's message"
          }
          className="shrink-0 rounded-pill bg-bg/80 p-1 shadow-card backdrop-blur"
        >
          <Narrator
            state={state}
            talking={talking && showBubble}
            size={56}
            forceFallback={forceFallback}
            reducedMotion={reducedMotion}
          />
        </button>
      </aside>
    </>
  );
}

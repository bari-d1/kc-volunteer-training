"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useNarratorPreferences } from "./use-narrator-preferences";

export type SpeechBubbleProps = {
  text: string;
  /** Type the text out character by character. */
  typing?: boolean;
  /** Milliseconds per character. */
  speed?: number;
  /** Override the visitor's reduced-motion preference. */
  reducedMotion?: boolean;
  /** True while characters are appearing; drive Narrator's `talking`. */
  onTalkingChange?: (talking: boolean) => void;
  /** Which side the tail points to (where the mascot is). */
  tail?: "left" | "bottom";
  className?: string;
};

/**
 * KC speech bubble. The typing effect is visual only: screen readers get
 * the whole text once through a polite live region, never letter by letter.
 */
export function SpeechBubble(props: SpeechBubbleProps) {
  // Remount per text so typing restarts cleanly.
  return <TypedBubble key={props.text} {...props} />;
}

function TypedBubble({
  text,
  typing = true,
  speed = 28,
  reducedMotion,
  onTalkingChange,
  tail = "left",
  className,
}: SpeechBubbleProps) {
  const preferences = useNarratorPreferences();
  const instant = !typing || (reducedMotion ?? preferences.reducedMotion);
  const [shown, setShown] = useState(instant ? text.length : 0);
  const visible = instant ? text.length : shown;

  useEffect(() => {
    if (instant) {
      onTalkingChange?.(false);
      return;
    }
    onTalkingChange?.(true);
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= text.length) {
        clearInterval(timer);
        onTalkingChange?.(false);
      }
    }, speed);
    return () => {
      clearInterval(timer);
      onTalkingChange?.(false);
    };
    // onTalkingChange is a callback prop; restarting on its identity would retype.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, text, speed]);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-lime bg-surface px-5 py-4 text-body text-text shadow-card",
        className,
      )}
    >
      {/* Tail toward the mascot. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute size-4 rotate-45 border-lime bg-surface",
          tail === "left"
            ? "top-1/2 -left-[9px] -translate-y-1/2 border-b-2 border-l-2"
            : "-bottom-[9px] left-8 border-r-2 border-b-2",
        )}
      />
      {/* Visual text, typed out. The ghost keeps the bubble's final size. */}
      <p aria-hidden="true" className="relative">
        <span className="invisible">{text}</span>
        <span className="absolute inset-0">{text.slice(0, visible)}</span>
      </p>
      {/* Read once, in full. */}
      <p aria-live="polite" className="sr-only">
        {text}
      </p>
    </div>
  );
}

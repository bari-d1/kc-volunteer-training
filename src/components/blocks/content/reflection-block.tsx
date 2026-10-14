"use client";

import { useId, useState } from "react";
import { useNarrator } from "@/components/narrator/narrator-context";
import { Button } from "@/components/ui/button";
import type { BlockProps } from "../block-props";

/**
 * A prompt to answer privately, then compare with KC's answer. The typed
 * answer only lives in this component's state: never stored or sent.
 */
export function ReflectionBlock({
  prompt,
  revealTitle,
  revealBody,
}: BlockProps<"REFLECTION">) {
  const id = useId();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const narrator = useNarrator();

  return (
    <div className="flex flex-col gap-5 rounded-lg bg-surface p-6 md:p-8">
      <label htmlFor={`${id}-answer`} className="text-h3">
        {prompt}
      </label>
      <textarea
        id={`${id}-answer`}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onFocus={() => narrator.setState("think")}
        onBlur={() => narrator.setState("idle")}
        placeholder="Type your answer"
        rows={4}
        aria-describedby={`${id}-note`}
        className="w-full resize-y rounded-md border-2 border-surface-2 bg-bg p-4 text-body text-text placeholder:text-muted/70 focus:border-lime"
      />
      <p id={`${id}-note`} className="text-small text-muted">
        Your answer stays in this browser. It isn&apos;t saved or sent to KC.
      </p>
      <Button
        variant="secondary"
        onClick={() => setRevealed(!revealed)}
        aria-expanded={revealed}
        aria-controls={`${id}-reveal`}
        className="self-start"
      >
        {revealed ? "Hide" : "Compare"}
      </Button>
      <div id={`${id}-reveal`} aria-live="polite">
        {revealed && (
          <div className="flex flex-col gap-2 border-l-4 border-lime pl-4">
            <span className="text-body-lg font-extrabold uppercase">
              {revealTitle}
            </span>
            <span className="text-body text-muted">{revealBody}</span>
          </div>
        )}
      </div>
    </div>
  );
}

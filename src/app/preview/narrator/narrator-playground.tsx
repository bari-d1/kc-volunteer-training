"use client";

import { useState } from "react";
import { Narrator } from "@/components/narrator/narrator";
import { NarratorDock } from "@/components/narrator/narrator-dock";
import {
  NARRATOR_STATES,
  type NarratorState,
} from "@/components/narrator/narrator-states";
import { SpeechBubble } from "@/components/narrator/speech-bubble";
import { Button } from "@/components/ui/button";
import { PillTag } from "@/components/ui/pill-tag";
import { cn } from "@/lib/cn";

const LINES: Record<NarratorState, string> = {
  idle: "I'm here whenever you need me.",
  wave: "Hi! I'm your guide. I'll walk with you through your onboarding.",
  point: "Have a look at the contacts below. You'll want these later.",
  think: "Take a moment with this one. What would you do?",
  celebrate: "You did it! Module complete. On to the next one!",
  encourage: "Not quite, but you're close. Have another go!",
};

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "flex items-center gap-3 rounded-pill border-2 px-4 py-2 text-small font-bold",
        on ? "border-lime text-lime" : "border-surface-2 text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-3 rounded-pill", on ? "bg-lime" : "bg-surface-2")}
      />
      {label}
    </button>
  );
}

export function NarratorPlayground() {
  const [state, setState] = useState<NarratorState>("wave");
  const [talking, setTalking] = useState(false);
  const [typingTalk, setTypingTalk] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [forceFallback, setForceFallback] = useState(false);
  const [showDock, setShowDock] = useState(false);
  const [replay, setReplay] = useState(0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-gutter py-16">
      <header className="flex flex-col gap-4">
        <PillTag>Development only</PillTag>
        <h1 className="text-h1">Narrator preview</h1>
      </header>

      <section aria-labelledby="controls" className="flex flex-col gap-5">
        <h2 id="controls" className="text-h3">
          Controls
        </h2>
        <div
          role="radiogroup"
          aria-label="State"
          className="flex flex-wrap gap-2"
        >
          {NARRATOR_STATES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={state === s}
              onClick={() => setState(s)}
              className={cn(
                "rounded-pill px-4 py-2 text-small font-bold uppercase",
                state === s
                  ? "bg-lime text-ink"
                  : "bg-surface-2 text-text hover:bg-surface",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Talking" on={talking} onChange={setTalking} />
          <Toggle
            label="Simulate reduced motion"
            on={reducedMotion}
            onChange={setReducedMotion}
          />
          <Toggle
            label="Force fallback"
            on={forceFallback}
            onChange={setForceFallback}
          />
          <Toggle label="Show dock" on={showDock} onChange={setShowDock} />
        </div>
      </section>

      <section aria-labelledby="sizes" className="flex flex-col gap-5">
        <h2 id="sizes" className="text-h3">
          Mascot
        </h2>
        <div className="flex flex-wrap items-end gap-8 rounded-lg bg-surface p-8">
          {[56, 96, 160].map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Narrator
                state={state}
                talking={talking || typingTalk}
                size={size}
                reducedMotion={reducedMotion}
                forceFallback={forceFallback}
              />
              <span className="font-mono text-small text-muted">{size}px</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="bubble" className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="bubble" className="text-h3">
            Speech bubble
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setReplay(replay + 1)}
          >
            Replay typing
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Narrator
            state={state}
            talking={talking || typingTalk}
            size={96}
            reducedMotion={reducedMotion}
            forceFallback={forceFallback}
          />
          <SpeechBubble
            key={replay}
            text={LINES[state]}
            reducedMotion={reducedMotion}
            onTalkingChange={setTypingTalk}
            className="flex-1"
          />
        </div>
      </section>

      {showDock && (
        <NarratorDock
          text={LINES[state]}
          state={state}
          reducedMotion={reducedMotion}
          forceFallback={forceFallback}
        />
      )}
    </main>
  );
}

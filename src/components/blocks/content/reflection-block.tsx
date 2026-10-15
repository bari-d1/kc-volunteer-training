"use client";

import { useEffect, useId, useRef, useState } from "react";
import { saveReflectionAction } from "@/app/actions/reflections";
import { useNarrator } from "@/components/narrator/narrator-context";
import { Button } from "@/components/ui/button";
import type { BlockProps } from "../block-props";
import { Markdown } from "./markdown";
import { useReflectionAnswer } from "./reflection-answers";

/** Wait this long after typing stops before saving. */
export const REFLECTION_SAVE_DELAY_MS = 1000;
const MAX_LENGTH = 2000;

type Status = "idle" | "saving" | "saved" | "error";

/**
 * A prompt to answer, then compare with KC's answer. In a lesson the answer
 * is saved to the volunteer's account as they type (and when they leave the
 * box), and is there again when they come back.
 */
export function ReflectionBlock({
  prompt,
  revealTitle,
  revealBody,
  blockId,
}: BlockProps<"REFLECTION">) {
  const id = useId();
  const { saving, saved } = useReflectionAnswer(blockId);
  const [answer, setAnswer] = useState(saved);
  const [status, setStatus] = useState<Status>("idle");
  const [revealed, setRevealed] = useState(false);
  const narrator = useNarrator();
  const lastSaved = useRef(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!saving || text.trim() === lastSaved.current.trim()) return;
    setStatus("saving");
    saveReflectionAction({ blockId, answer: text })
      .then((result) => {
        if (!result.ok) throw new Error(result.error);
        lastSaved.current = text;
        setStatus("saved");
      })
      .catch(() => setStatus("error"));
  };

  // Don't leave a pending save behind when the lesson unmounts.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onChange = (text: string) => {
    setAnswer(text);
    if (!saving) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(text), REFLECTION_SAVE_DELAY_MS);
  };

  const note = !saving
    ? "Your answer isn't saved in this preview."
    : status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved to your training record."
        : status === "error"
          ? "We couldn't save your answer. Keep typing to try again."
          : "Your answer is saved to your training record as you type.";

  return (
    <div className="flex flex-col gap-5 rounded-lg bg-surface p-6 md:p-8">
      <label htmlFor={`${id}-answer`} className="text-h3">
        {prompt}
      </label>
      <textarea
        id={`${id}-answer`}
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => narrator.setState("think")}
        onBlur={() => {
          narrator.setState("idle");
          save(answer);
        }}
        placeholder="Type your answer"
        rows={4}
        maxLength={MAX_LENGTH}
        aria-describedby={`${id}-note`}
        className="w-full resize-y rounded-md border-2 border-surface-2 bg-bg p-4 text-body text-text placeholder:text-muted/70 focus:border-lime"
      />
      <p
        id={`${id}-note`}
        aria-live="polite"
        className={
          status === "error"
            ? "text-small text-danger"
            : "text-small text-muted"
        }
      >
        {note}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          save(answer);
          setRevealed(!revealed);
        }}
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
            <Markdown className="text-body text-muted">{revealBody}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

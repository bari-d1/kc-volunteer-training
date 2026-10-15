"use client";

import { useEffect, useId, useRef, useState } from "react";
import { saveReflectionAction } from "@/app/actions/reflections";
import { useNarrator } from "@/components/narrator/narrator-context";
import { Button } from "@/components/ui/button";
import type { BlockProps } from "../block-props";
import { Markdown } from "./markdown";
import { useReflectionAnswer } from "./reflection-answers";

/** Wait this long after typing stops before saving in the background. */
export const REFLECTION_SAVE_DELAY_MS = 1000;
const MAX_LENGTH = 2000;

type Status = "idle" | "saving" | "saved" | "error";

/**
 * A prompt to answer, then Save to see KC's answer. In a lesson the answer
 * is saved to the volunteer's account (quietly in the background too, so
 * nothing is lost) and is there again, with KC's answer, when they return.
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
  // Someone who already answered sees KC's answer straight away.
  const [revealed, setRevealed] = useState(saved.trim() !== "");
  const narrator = useNarrator();
  const lastSaved = useRef(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Saves if changed. `announce` shows "Saved"; background saves are quiet. */
  const save = (text: string, announce: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!saving) return;
    if (text.trim() === lastSaved.current.trim()) {
      if (announce && text.trim()) setStatus("saved");
      return;
    }
    if (announce) setStatus("saving");
    saveReflectionAction({ blockId, answer: text })
      .then((result) => {
        if (!result.ok) throw new Error(result.error);
        lastSaved.current = text;
        if (announce) setStatus("saved");
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
    setStatus((current) => (current === "error" ? current : "idle"));
    if (!saving) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => save(text, false),
      REFLECTION_SAVE_DELAY_MS,
    );
  };

  const message =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "We couldn't save your answer. Please try again."
          : null;

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
          save(answer, false);
        }}
        placeholder="Type your answer"
        rows={4}
        maxLength={MAX_LENGTH}
        className="w-full resize-y rounded-md border-2 border-surface-2 bg-bg p-4 text-body text-text placeholder:text-muted/70 focus:border-lime"
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => {
            save(answer, true);
            setRevealed(true);
          }}
          disabled={!answer.trim()}
          aria-controls={`${id}-reveal`}
        >
          Save
        </Button>
        <p
          aria-live="polite"
          className={
            status === "error"
              ? "text-small text-danger"
              : "text-small text-muted"
          }
        >
          {message}
        </p>
      </div>
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

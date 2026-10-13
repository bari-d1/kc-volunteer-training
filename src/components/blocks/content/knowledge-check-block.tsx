"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  checkKnowledgeAnswer,
  completeKnowledgeCheck,
} from "@/app/actions/knowledge-check";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

export type KnowledgeCheckPassed = {
  blockId: string;
  moduleId: string;
  modulePassed: boolean;
};

/** Window event fired when a check is passed, for server-rendered lesson pages. */
export const KNOWLEDGE_CHECK_PASSED_EVENT = "kc:knowledge-check-passed";

type Result = { correct: boolean; explanation: string } | null;

function Tick() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="shrink-0"
    >
      <circle cx="10" cy="10" r="10" className="fill-success" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        fill="none"
        stroke="#191919"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KnowledgeCheckBlock({
  questions,
  blockId,
  moduleId,
  onPassed,
}: BlockProps<"KNOWLEDGE_CHECK"> & {
  onPassed?: (event: KnowledgeCheckPassed) => void;
}) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<KnowledgeCheckPassed | null>(null);
  const [pending, startTransition] = useTransition();
  const correctAnswers = useRef(new Map<number, string>());
  const promptRef = useRef<HTMLLegendElement>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const check = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await checkKnowledgeAnswer({
          blockId,
          questionIndex: index,
          optionId: selected,
        });
        if (!response.ok) {
          setError(
            response.error === "locked"
              ? "Finish the previous module first."
              : "This question isn't available right now.",
          );
          return;
        }
        setResult({
          correct: response.correct,
          explanation: response.explanation,
        });
        if (response.correct) correctAnswers.current.set(index, selected);
      } catch {
        setError("We couldn't check your answer. Please try again.");
      }
    });
  };

  const tryAgain = () => {
    setResult(null);
    setSelected(null);
    promptRef.current?.focus();
  };

  const next = () => {
    setIndex(index + 1);
    setResult(null);
    setSelected(null);
    // Move focus to the new question so screen readers read it.
    requestAnimationFrame(() => promptRef.current?.focus());
  };

  const done = () => {
    setError(null);
    startTransition(async () => {
      try {
        const answers = [...correctAnswers.current].map(
          ([questionIndex, optionId]) => ({
            questionIndex,
            optionId,
          }),
        );
        const response = await completeKnowledgeCheck({ blockId, answers });
        if (!response.ok || !response.blockPassed) {
          setError("We couldn't record your result. Please try again.");
          return;
        }
        const event = {
          blockId,
          moduleId,
          modulePassed: response.modulePassed,
        };
        setFinished(event);
        onPassed?.(event);
        window.dispatchEvent(
          new CustomEvent(KNOWLEDGE_CHECK_PASSED_EVENT, { detail: event }),
        );
      } catch {
        setError("We couldn't record your result. Please try again.");
      }
    });
  };

  if (finished) {
    return (
      <div
        role="status"
        className="flex items-center gap-4 rounded-lg border-2 border-success bg-surface p-6"
      >
        <Tick />
        <div className="flex flex-col gap-1">
          <span className="text-body-lg font-extrabold uppercase">
            Knowledge check complete
          </span>
          <span className="text-body text-muted">
            You answered all {questions.length} question
            {questions.length === 1 ? "" : "s"} correctly.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-surface p-6 md:p-8">
      <fieldset
        className="flex flex-col gap-4"
        disabled={result !== null || pending}
      >
        <span className="text-label text-lime">
          Question {index + 1} of {questions.length}
        </span>
        <legend
          ref={promptRef}
          tabIndex={-1}
          className="float-left mb-2 w-full text-h3 focus:outline-none"
        >
          {question.prompt}
        </legend>
        <div className="flex flex-col gap-3">
          {question.options.map((option) => {
            const checked = selected === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-4 rounded-md border-2 bg-bg px-5 py-4 text-body-lg transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lime has-disabled:cursor-default",
                  checked
                    ? "border-lime"
                    : "border-surface-2 hover:border-muted",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-q${index}`}
                  value={option.id}
                  checked={checked}
                  onChange={() => setSelected(option.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-pill border-2",
                    checked ? "border-lime" : "border-muted",
                  )}
                >
                  {checked && <span className="size-3 rounded-pill bg-lime" />}
                </span>
                {option.text}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite" className="empty:hidden">
        {result && (
          <div
            className={cn(
              "flex flex-col gap-2 border-l-4 pl-4",
              result.correct ? "border-success" : "border-danger",
            )}
          >
            <span className="flex items-center gap-2 text-body-lg font-extrabold">
              {result.correct ? (
                <>
                  <Tick /> Correct
                </>
              ) : (
                "Not quite"
              )}
            </span>
            <span className="text-body text-muted">{result.explanation}</span>
          </div>
        )}
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </div>

      <div>
        {!result && (
          <Button onClick={check} disabled={!selected} loading={pending}>
            Check answer
          </Button>
        )}
        {result && !result.correct && (
          <Button variant="secondary" onClick={tryAgain}>
            Try again
          </Button>
        )}
        {result?.correct &&
          (isLast ? (
            <Button onClick={done} loading={pending}>
              Done
            </Button>
          ) : (
            <Button onClick={next}>Next</Button>
          ))}
      </div>
    </div>
  );
}

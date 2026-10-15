"use client";

import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { certificatePdfHref } from "@/lib/certificate-links";
import { cn } from "@/lib/cn";
import type { QuestionResult, SubmittedAttempt } from "@/server/quiz";

/** Missed questions first, each keeping its number from the quiz. */
export function orderResults(results: QuestionResult[]) {
  const numbered = results.map((result, index) => ({
    ...result,
    number: index + 1,
  }));
  return [
    ...numbered.filter((r) => !r.correct),
    ...numbered.filter((r) => r.correct),
  ];
}

export function QuizResults({
  result,
  headingRef,
  modulesHref,
  next,
  onRetry,
  retrying,
  error,
}: {
  result: SubmittedAttempt;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** The course's module list, for revising. */
  modulesHref: string;
  next: { href: string; title: string } | null;
  onRetry: () => void;
  retrying: boolean;
  error: ReactNode;
}) {
  const missed = result.results.filter((r) => !r.correct).length;
  const scoreText = `${result.score} out of ${result.total}`;

  return (
    <section
      aria-labelledby="quiz-result-heading"
      className="flex flex-col gap-8"
    >
      <div
        className={cn(
          "flex flex-col gap-6 rounded-lg border-2 bg-surface p-6 md:p-8",
          result.passed ? "border-lime" : "border-surface-2",
        )}
      >
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <ProgressRing
            value={result.score}
            max={result.total}
            label="Your score"
            valueText={scoreText}
            size={128}
            strokeWidth={10}
          >
            {result.score}
            <span className="text-muted">/{result.total}</span>
          </ProgressRing>
          <div className="flex flex-col gap-2">
            <h2
              id="quiz-result-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-h2 focus:outline-none"
            >
              {result.passed ? "You passed!" : "Not quite this time"}
            </h2>
            <p className="text-body-lg">
              You got <strong>{scoreText}</strong>. The pass mark is{" "}
              {result.passMark}%.
            </p>
            <p className="text-body text-muted">
              {result.passed
                ? "Your training is complete. Welcome to the team!"
                : "Look over the answers below to see what you missed."}
            </p>
          </div>
        </div>

        {error}

        {result.passed ? (
          <div className="flex flex-col gap-4 border-t border-surface-2 pt-6">
            <p className="text-label text-lime">What&apos;s next</p>
            {next ? (
              <div className="flex flex-col gap-2">
                <Button size="lg" href={next.href} className="w-full sm:w-fit">
                  Finish your training <span aria-hidden="true">→</span>
                </Button>
                <p className="text-small text-muted">
                  See your certificate, your branch and team, and what to expect
                  on your first Sunday.
                </p>
              </div>
            ) : null}
            {result.certificateNumber && (
              <div className="flex flex-col gap-2">
                <Button
                  variant={next ? "secondary" : "primary"}
                  size="lg"
                  href={certificatePdfHref(result.certificateNumber)}
                  prefetch={false}
                  download
                  className="w-full sm:w-fit"
                >
                  Download certificate (PDF)
                </Button>
                <p className="text-small text-muted">
                  Certificate number {result.certificateNumber}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-t border-surface-2 pt-6">
            <p className="text-label text-lime">What&apos;s next</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onRetry}
                loading={retrying}
                className="w-full sm:w-fit"
              >
                Try again with new questions
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href={modulesHref}
                className="w-full sm:w-fit"
              >
                Revise the modules first
              </Button>
            </div>
            <p className="text-small text-muted">
              You need {result.passMark}% to pass, and you can retake the quiz
              as many times as you need.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-h3">Your answers</h3>
        {missed > 0 && (
          <p className="text-body text-muted">
            The{" "}
            {missed === 1
              ? "question you missed is"
              : `${missed} questions you missed are`}{" "}
            first.
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {orderResults(result.results).map((r) => (
            <ResultItem key={r.questionId} result={r} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function ResultItem({
  result: r,
}: {
  result: QuestionResult & { number: number };
}) {
  const text = (id: string) => r.options.find((o) => o.id === id)?.text ?? "";
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-md border-l-4 bg-surface p-4 md:p-5",
        r.correct ? "border-success" : "border-danger",
      )}
    >
      <span className="text-label text-muted">
        Question {r.number} ·{" "}
        <span className={r.correct ? "text-success" : "text-danger"}>
          {r.correct ? "Correct" : "Missed"}
        </span>
      </span>
      <span className="text-body-lg font-bold">{r.prompt}</span>
      <span className="text-body">
        <span className="text-muted">Your answer: </span>
        <span className={cn(!r.correct && "line-through decoration-danger")}>
          {text(r.selectedOptionId)}
        </span>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-label text-muted">Correct answer</span>
        <span className="w-fit rounded-md border-2 border-lime bg-lime/10 px-3 py-2 text-body font-bold">
          {text(r.correctOptionId)}
        </span>
      </span>
      <span className="text-body text-muted">{r.explanation}</span>
    </li>
  );
}

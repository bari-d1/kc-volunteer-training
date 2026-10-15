"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { startQuizAction, submitQuizAction } from "@/app/actions/quiz";
import { useNarrator } from "@/components/narrator/narrator-context";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import type { PublicQuizQuestion } from "@/lib/schemas/quiz";
import type { SubmittedAttempt } from "@/server/quiz";

export type FinalQuizProps = {
  courseSlug: string;
  questionsPerAttempt: number;
  passMark: number;
  /** An unfinished attempt can be resumed. */
  hasOpenAttempt: boolean;
  /** Where Continue goes after passing. */
  next: { href: string; title: string } | null;
};

type Answers = Record<string, string>;
type Attempt = { attemptId: string; questions: PublicQuizQuestion[] };
type Phase =
  | { name: "intro" }
  | { name: "question"; index: number; fromReview: boolean }
  | { name: "review" }
  | { name: "result"; result: SubmittedAttempt };

const storageKey = (attemptId: string) => `kc:quiz:${attemptId}`;

/** Saved answers for an attempt, keeping only ones that still fit its questions. */
function loadAnswers(attempt: Attempt): Answers {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(storageKey(attempt.attemptId)) ?? "{}",
    );
    if (!saved || typeof saved !== "object") return {};
    const answers: Answers = {};
    for (const q of attempt.questions) {
      const optionId = (saved as Record<string, unknown>)[q.id];
      if (q.options.some((o) => o.id === optionId)) {
        answers[q.id] = optionId as string;
      }
    }
    return answers;
  } catch {
    return {};
  }
}

function saveAnswers(attemptId: string, answers: Answers) {
  try {
    sessionStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
  } catch {
    // Storage blocked: answers still live in state until a refresh.
  }
}

function forgetAnswers(attemptId: string) {
  try {
    sessionStorage.removeItem(storageKey(attemptId));
  } catch {
    // Nothing to clean up.
  }
}

const ERRORS: Record<string, string> = {
  locked: "Complete every module before taking the quiz.",
  unavailable: "The quiz isn't available right now. Please try again later.",
  expired: "This attempt timed out. Start the quiz again for a fresh set.",
  "already-submitted": "This attempt has already been submitted.",
};
const errorMessage = (code: string) =>
  ERRORS[code] ?? "Something went wrong. Please try again.";

/**
 * The final quiz: an intro, one question per screen, a review of every
 * answer, then the server's marking. Nothing reveals right or wrong until
 * the whole attempt is submitted.
 */
export function FinalQuiz({
  courseSlug,
  questionsPerAttempt,
  passMark,
  hasOpenAttempt,
  next,
}: FinalQuizProps) {
  const router = useRouter();
  const narrator = useNarrator();
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [canResume, setCanResume] = useState(hasOpenAttempt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Each new screen moves focus to its heading so screen readers start there.
  const screen =
    phase.name === "question" ? `question-${phase.index}` : phase.name;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [screen]);

  const { say, setState } = narrator;
  useEffect(() => {
    if (phase.name !== "intro") return;
    say(
      "This is it! Take your time, and remember you can retake it as many times as you need.",
      "wave",
      { key: "quiz:intro", once: "visit" },
    );
  }, [phase.name, say]);

  const start = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await startQuizAction(courseSlug);
        if (!response.ok) {
          setError(errorMessage(response.error));
          return;
        }
        const started = {
          attemptId: response.attemptId,
          questions: response.questions,
        };
        const saved = loadAnswers(started);
        setAttempt(started);
        setAnswers(saved);
        const firstUnanswered = started.questions.findIndex(
          (q) => !saved[q.id],
        );
        setPhase({
          name: "question",
          index: Math.max(firstUnanswered, 0),
          fromReview: false,
        });
        narrator.dismiss();
        setState("think");
      } catch {
        setError(errorMessage("unknown"));
      }
    });
  };

  const choose = (questionId: string, optionId: string) => {
    if (!attempt) return;
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);
    saveAnswers(attempt.attemptId, updated);
  };

  const goTo = (index: number, fromReview = false) => {
    setError(null);
    setPhase({ name: "question", index, fromReview });
    setState("think");
  };

  const submit = () => {
    if (!attempt) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await submitQuizAction({
          attemptId: attempt.attemptId,
          answers: attempt.questions.map((q) => ({
            questionId: q.id,
            optionId: answers[q.id],
          })),
        });
        if (!response.ok) {
          setError(errorMessage(response.error));
          if (response.error === "expired") {
            forgetAnswers(attempt.attemptId);
            setAttempt(null);
            setCanResume(false);
            setPhase({ name: "intro" });
          }
          return;
        }
        forgetAnswers(attempt.attemptId);
        setCanResume(false);
        setPhase({ name: "result", result: response });
        say(
          response.passed
            ? "You passed! Well done, that's your training complete."
            : "Not this time, but you're close. Have a look at the answers and try again.",
          response.passed ? "celebrate" : "encourage",
        );
        // Sidebar and dashboard pick up the completed module.
        if (response.passed) router.refresh();
      } catch {
        setError(errorMessage("unknown"));
      }
    });
  };

  const retake = () => {
    setAttempt(null);
    setAnswers({});
    start();
  };

  const errorBox = error && (
    <p role="alert" className="text-small text-danger">
      {error}
    </p>
  );

  if (phase.name === "intro") {
    return (
      <section
        aria-labelledby="quiz-intro-heading"
        className="flex flex-col gap-6 rounded-lg bg-surface p-6 md:p-8"
      >
        <h2
          id="quiz-intro-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-h2 focus:outline-none"
        >
          {canResume ? "Pick up where you left off" : "Ready for the quiz?"}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          <li className="flex flex-col gap-1 rounded-md bg-bg p-4">
            <span className="text-h2 text-lime">{questionsPerAttempt}</span>
            <span className="text-small text-muted">questions</span>
          </li>
          <li className="flex flex-col gap-1 rounded-md bg-bg p-4">
            <span className="text-h2 text-lime">{passMark}%</span>
            <span className="text-small text-muted">to pass</span>
          </li>
        </ul>
        <p className="text-body-lg">
          You can retake it as many times as you need.
        </p>
        <p className="text-body text-muted">
          One question at a time. You can go back and change any answer before
          you submit.
        </p>
        {errorBox}
        <Button
          size="lg"
          onClick={start}
          loading={pending}
          className="w-full sm:w-fit"
        >
          {canResume ? "Resume quiz" : "Start quiz"}
        </Button>
      </section>
    );
  }

  if (!attempt) return null;
  const total = attempt.questions.length;

  if (phase.name === "question") {
    const question = attempt.questions[phase.index];
    const isLast = phase.index === total - 1;
    return (
      <QuestionScreen
        key={question.id}
        headingRef={headingRef}
        question={question}
        number={phase.index + 1}
        total={total}
        selected={answers[question.id] ?? null}
        onChoose={(optionId) => choose(question.id, optionId)}
        onBack={phase.index > 0 ? () => goTo(phase.index - 1) : null}
        onNext={() =>
          phase.fromReview || isLast
            ? setPhase({ name: "review" })
            : goTo(phase.index + 1)
        }
        nextLabel={
          phase.fromReview
            ? "Back to review"
            : isLast
              ? "Review answers"
              : "Next"
        }
      />
    );
  }

  if (phase.name === "review") {
    const unanswered = attempt.questions.filter((q) => !answers[q.id]).length;
    return (
      <section
        aria-labelledby="quiz-review-heading"
        className="flex flex-col gap-6"
      >
        <h2
          id="quiz-review-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-h2 focus:outline-none"
        >
          Review your answers
        </h2>
        <p className="text-body text-muted">
          Tap a question to change your answer.
        </p>
        <ol className="flex flex-col gap-3">
          {attempt.questions.map((q, index) => {
            const chosen = q.options.find((o) => o.id === answers[q.id]);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => goTo(index, true)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-md border-2 bg-surface p-4 text-left transition-colors hover:border-muted",
                    chosen ? "border-surface-2" : "border-danger",
                  )}
                >
                  <span className="text-label text-lime">
                    Question {index + 1}
                  </span>
                  <span className="text-body-lg font-bold">{q.prompt}</span>
                  {chosen ? (
                    <span className="text-body text-muted">
                      Your answer: {chosen.text}
                    </span>
                  ) : (
                    <span className="text-body font-bold text-danger">
                      Not answered
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        {unanswered > 0 && (
          <p role="alert" className="text-body font-bold text-danger">
            {unanswered === 1
              ? "1 question still needs an answer"
              : `${unanswered} questions still need an answer`}{" "}
            before you can submit.
          </p>
        )}
        {errorBox}
        <Button
          size="lg"
          onClick={submit}
          disabled={unanswered > 0}
          loading={pending}
          className="w-full sm:w-fit"
        >
          Submit answers
        </Button>
      </section>
    );
  }

  const { result } = phase;
  const percent = Math.round((result.score / result.total) * 100);
  return (
    <section
      aria-labelledby="quiz-result-heading"
      className="flex flex-col gap-6"
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border-2 bg-surface p-6 md:p-8",
          result.passed ? "border-success" : "border-surface-2",
        )}
      >
        <h2
          id="quiz-result-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-h2 focus:outline-none"
        >
          {result.passed ? "You passed!" : "Not quite this time"}
        </h2>
        <p className="text-body-lg">
          You scored {result.score} out of {result.total} ({percent}%). The pass
          mark is {result.passMark}%.
        </p>
        {result.passed && result.certificateNumber && (
          <p className="text-body text-muted">
            Certificate number {result.certificateNumber}
          </p>
        )}
        {errorBox}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          {result.passed ? (
            next && (
              <Button size="lg" href={next.href} className="w-full sm:w-fit">
                Continue: {next.title}
              </Button>
            )
          ) : (
            <Button
              size="lg"
              onClick={retake}
              loading={pending}
              className="w-full sm:w-fit"
            >
              Retake quiz
            </Button>
          )}
        </div>
      </div>

      <h3 className="text-h3">Your answers</h3>
      <ol className="flex flex-col gap-3">
        {result.results.map((r, index) => {
          const text = (id: string) =>
            r.options.find((o) => o.id === id)?.text ?? "";
          return (
            <li
              key={r.questionId}
              className={cn(
                "flex flex-col gap-2 rounded-md border-l-4 bg-surface p-4",
                r.correct ? "border-success" : "border-danger",
              )}
            >
              <span className="text-label text-lime">
                Question {index + 1} · {r.correct ? "Correct" : "Incorrect"}
              </span>
              <span className="text-body-lg font-bold">{r.prompt}</span>
              <span className="text-body">
                Your answer: {text(r.selectedOptionId)}
              </span>
              {!r.correct && (
                <span className="text-body">
                  Correct answer: {text(r.correctOptionId)}
                </span>
              )}
              <span className="text-body text-muted">{r.explanation}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function QuestionScreen({
  headingRef,
  question,
  number,
  total,
  selected,
  onChoose,
  onBack,
  onNext,
  nextLabel,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  question: PublicQuizQuestion;
  number: number;
  total: number;
  selected: string | null;
  onChoose: (optionId: string) => void;
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-prompt`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-label text-lime">
          Question {number} of {total}
        </span>
        <ProgressBar value={number} max={total} label="Quiz progress" />
      </div>

      <h2
        id={`${id}-prompt`}
        ref={headingRef}
        tabIndex={-1}
        className="text-h3 focus:outline-none"
      >
        <span className="sr-only">
          Question {number} of {total}:{" "}
        </span>
        {question.prompt}
      </h2>

      {/* Native radios: arrow keys move between options and select them. */}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-prompt`}
        className="flex flex-col gap-3"
      >
        {question.options.map((option) => {
          const checked = selected === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-16 cursor-pointer items-center gap-4 rounded-md border-2 bg-surface px-5 py-4 text-body-lg transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lime",
                checked ? "border-lime" : "border-surface-2 hover:border-muted",
              )}
            >
              <input
                type="radio"
                name={`${id}-options`}
                value={option.id}
                checked={checked}
                onChange={() => onChoose(option.id)}
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

      {/* Next sits on the right, under the thumb, on a phone. */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </Button>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={onNext}>
          {nextLabel}
          {nextLabel === "Next" && <span aria-hidden="true">→</span>}
        </Button>
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  completeModuleAction,
  saveProgressAction,
} from "@/app/actions/progress";
import {
  KNOWLEDGE_CHECK_PASSED_EVENT,
  type KnowledgeCheckPassed,
} from "@/components/blocks/content/knowledge-check-block";
import { Button } from "@/components/ui/button";

/** Saves progress at most this often while scrolling. */
export const SAVE_INTERVAL_MS = 3000;

export type LessonProgressProps = {
  moduleId: string;
  requiresCheck: boolean;
  initial: { lastBlockOrder: number; checkPassed: boolean; completed: boolean };
  /** Lowest block order on the page; resuming only makes sense past it. */
  firstBlockOrder: number;
  /** Where Continue goes after completing: the next module or the dashboard. */
  continueHref: string;
  nextTitle: string | null;
  children: ReactNode;
};

/**
 * Wraps a lesson's blocks: records the furthest block scrolled into view,
 * offers to resume there, and gates the Continue button on the knowledge
 * check (or on reaching the end of the page).
 */
export function LessonProgress({
  moduleId,
  requiresCheck,
  initial,
  firstBlockOrder,
  continueHref,
  nextTitle,
  children,
}: LessonProgressProps) {
  const router = useRouter();
  const hintId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [checkPassed, setCheckPassed] = useState(initial.checkPassed);
  const [showResume, setShowResume] = useState(
    !initial.completed && initial.lastBlockOrder > firstBlockOrder,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ── Progress saving ──────────────────────────────────────────────────────
  const furthest = useRef(initial.lastBlockOrder);
  const saved = useRef(initial.lastBlockOrder);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (furthest.current <= saved.current) return;
      const previous = saved.current;
      saved.current = furthest.current;
      void saveProgressAction({
        moduleId,
        lastBlockOrder: furthest.current,
      }).catch(() => {
        // Roll back so the next scroll retries.
        saved.current = previous;
      });
    };
    const schedule = () => {
      if (!timer.current) timer.current = setTimeout(flush, SAVE_INTERVAL_MS);
    };

    const blocks =
      containerRef.current?.querySelectorAll<HTMLElement>(
        "[data-block-order]",
      ) ?? [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const order = Number(
            (entry.target as HTMLElement).dataset.blockOrder,
          );
          if (Number.isFinite(order) && order > furthest.current) {
            furthest.current = order;
            schedule();
          }
        }
      },
      // Counts once a block reaches the upper 60% of the screen.
      { rootMargin: "0px 0px -40% 0px" },
    );
    blocks.forEach((block) => observer.observe(block));

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [moduleId]);

  // ── Bottom of page ───────────────────────────────────────────────────────
  useEffect(() => {
    const end = endRef.current;
    if (!end) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setReachedEnd(true);
        observer.disconnect();
      }
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  // ── Knowledge check ──────────────────────────────────────────────────────
  useEffect(() => {
    const onPassed = (event: Event) => {
      const detail = (event as CustomEvent<KnowledgeCheckPassed>).detail;
      if (detail.moduleId === moduleId && detail.modulePassed)
        setCheckPassed(true);
    };
    window.addEventListener(KNOWLEDGE_CHECK_PASSED_EVENT, onPassed);
    return () =>
      window.removeEventListener(KNOWLEDGE_CHECK_PASSED_EVENT, onPassed);
  }, [moduleId]);

  const resume = () => {
    setShowResume(false);
    const target = containerRef.current?.querySelector<HTMLElement>(
      `[data-block-order="${initial.lastBlockOrder}"]`,
    );
    if (!target) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  const needsCheck = requiresCheck && !checkPassed && !initial.completed;
  const canContinue =
    initial.completed || (requiresCheck ? checkPassed : reachedEnd);
  const hint = needsCheck
    ? "Complete the check above to continue"
    : !canContinue
      ? "Reach the end of the module to continue"
      : null;

  const onContinue = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeModuleAction({ moduleId });
        if (!result.ok) {
          setError(
            result.error === "check-required"
              ? "Complete the check above to continue"
              : "We couldn't save your progress. Please try again.",
          );
          return;
        }
        router.push(continueHref);
      } catch {
        setError("We couldn't save your progress. Please try again.");
      }
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-10">
      {showResume && (
        <Button variant="secondary" onClick={resume} className="self-start">
          Pick up where you left off
        </Button>
      )}

      {children}

      <div ref={endRef} aria-hidden="true" />

      <footer className="flex flex-col items-start gap-3 border-t border-surface-2 pt-8">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!canContinue}
          loading={pending}
          aria-describedby={hint ? hintId : undefined}
          className="h-auto! min-h-14 py-3 text-left whitespace-normal!"
        >
          {nextTitle
            ? `Continue: ${nextTitle}`
            : "Finish and return to dashboard"}
        </Button>
        {hint && (
          <p id={hintId} className="text-small text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </footer>
    </div>
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Saved answers by block id; null where answers aren't saved (previews). */
const ReflectionAnswersContext = createContext<Record<string, string> | null>(
  null,
);

/** Lesson pages wrap their blocks in this so reflection answers are saved. */
export function ReflectionAnswersProvider({
  answers,
  children,
}: {
  answers: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <ReflectionAnswersContext.Provider value={answers}>
      {children}
    </ReflectionAnswersContext.Provider>
  );
}

/** { saving: false } outside a lesson, e.g. the block previews. */
export function useReflectionAnswer(blockId: string) {
  const answers = useContext(ReflectionAnswersContext);
  return answers === null
    ? { saving: false as const, saved: "" }
    : { saving: true as const, saved: answers[blockId] ?? "" };
}

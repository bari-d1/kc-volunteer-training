"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { completeModuleAction } from "@/app/actions/progress";
import { useNarrator } from "@/components/narrator/narrator-context";
import { Confetti } from "./confetti";

/**
 * Confetti, the narrator celebrating, and marking this last module complete
 * the first time it's opened (it has no Continue button).
 */
export function Celebration({
  moduleId,
  completed,
}: {
  moduleId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const { say } = useNarrator();

  useEffect(() => {
    say(
      "You did it! Welcome to the family. We're so glad you're here.",
      "celebrate",
      {
        key: "completion:celebrate",
        once: "session",
      },
    );
  }, [say]);

  useEffect(() => {
    if (completed) return;
    let cancelled = false;
    completeModuleAction({ moduleId })
      .then((result) => {
        // Refresh so the sidebar and dashboard show every module done.
        if (!cancelled && result.ok && result.newlyCompleted) router.refresh();
      })
      .catch(() => {
        // Not critical: it's retried next time the page opens.
      });
    return () => {
      cancelled = true;
    };
  }, [completed, moduleId, router]);

  return <Confetti />;
}

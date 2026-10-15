"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * Runs an admin action (one returning an ActionResult from
 * @/lib/form-errors) and toasts the outcome: success with your message,
 * failure with the action's error (or a generic one if it threw).
 */
export function useSaveToast() {
  const { toast } = useToast();
  return useCallback(
    async <R extends { ok: true } | { ok: false; error: string }>(
      action: () => Promise<R>,
      { success = "Saved" }: { success?: string } = {},
    ): Promise<R | { ok: false; error: string }> => {
      try {
        const result = await action();
        if (result.ok) toast({ variant: "success", title: success });
        else toast({ variant: "error", title: result.error });
        return result;
      } catch {
        const error = "Something went wrong. Please try again.";
        toast({ variant: "error", title: error });
        return { ok: false, error };
      }
    },
    [toast],
  );
}

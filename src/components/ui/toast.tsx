"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Defaults to 5000. */
  duration?: number;
};

type ToastItem = Required<Omit<ToastOptions, "description">> & {
  id: number;
  description?: string;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success",
  error: "border-danger",
  info: "border-lime",
};

const variantLabels: Record<ToastVariant, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [
      ...current,
      { variant: "info", duration: 5000, ...options, id },
    ]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const polite = toasts.filter((t) => t.variant !== "error");
  const assertive = toasts.filter((t) => t.variant === "error");

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Live regions stay mounted so screen readers announce new toasts. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-3 p-4 sm:items-end">
        <div
          aria-live="assertive"
          role="alert"
          className="flex w-full flex-col items-center gap-3 sm:items-end"
        >
          {assertive.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div
          aria-live="polite"
          role="status"
          className="flex w-full flex-col items-center gap-3 sm:items-end"
        >
          {polite.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);

  // Pause while hovered or focused so there is time to read it.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border-l-4 bg-surface-2 p-4 shadow-card",
        variantClasses[toast.variant],
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-small font-bold">
          <span className="sr-only">{variantLabels[toast.variant]}: </span>
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-small text-muted">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-surface hover:text-text"
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}

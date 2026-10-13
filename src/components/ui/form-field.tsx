import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClasses =
  "h-14 w-full rounded-md border-2 bg-surface px-4 text-body text-text placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-50";

function describedBy(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

/** Errors appear after a submit, so they're announced as alerts. */
export function FieldError({
  id,
  children,
}: {
  id: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-small text-danger">
      {children}
    </p>
  );
}

type FieldProps = {
  label: ReactNode;
  /** Shown under the control; announced with it. */
  hint?: ReactNode;
  error?: string;
};

export type TextFieldProps = FieldProps &
  Omit<ComponentPropsWithRef<"input">, "id">;

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          error ? `${id}-error` : undefined,
          hint ? `${id}-hint` : undefined,
        )}
        className={cn(
          controlClasses,
          error ? "border-danger" : "border-surface-2 focus:border-lime",
        )}
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

export type SelectFieldProps = FieldProps &
  Omit<ComponentPropsWithRef<"select">, "id">;

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            error ? `${id}-error` : undefined,
            hint ? `${id}-hint` : undefined,
          )}
          className={cn(
            controlClasses,
            "appearance-none pr-12",
            error ? "border-danger" : "border-surface-2 focus:border-lime",
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

export type CheckboxFieldProps = {
  label: ReactNode;
  error?: string;
  className?: string;
} & Omit<ComponentPropsWithRef<"input">, "id" | "type">;

export function CheckboxField({
  label,
  error,
  className,
  ...props
}: CheckboxFieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "mt-0.5 size-6 shrink-0 cursor-pointer rounded-sm border-2 bg-surface accent-lime",
            error ? "border-danger" : "border-surface-2",
          )}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-body">
          {label}
        </label>
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

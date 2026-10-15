"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border-2 bg-surface px-3 text-small text-text placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-50";
const border = (error?: string) =>
  error ? "border-danger" : "border-surface-2 focus:border-lime";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  /** From fieldErrors(): shown under the control and announced. */
  error?: string;
  className?: string;
};

/** Label, hint and error around one control, with the aria wiring done. */
function Field({
  label,
  hint,
  error,
  className,
  children,
}: FieldProps & {
  children: (ids: {
    id: string;
    describedBy?: string;
    invalid?: true;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-bold">
        {label}
      </label>
      {children({ id, describedBy, invalid: error ? true : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function AdminTextField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"input">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(control, "h-10", border(error))}
          {...props}
        />
      )}
    </Field>
  );
}

export function AdminTextareaField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"textarea">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={4}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(control, "resize-y py-2", border(error))}
          {...props}
        />
      )}
    </Field>
  );
}

export function AdminSelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"select">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(control, "h-10", border(error))}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function AdminCheckboxField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"input">, "id" | "type">) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="flex items-center gap-2 text-small">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="size-4 accent-lime"
          {...props}
        />
        <span className="font-bold">{label}</span>
      </label>
      {hint && <p className="pl-6 text-small text-muted">{hint}</p>}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="pl-6 text-small text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

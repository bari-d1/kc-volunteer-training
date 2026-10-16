"use client";

import { useId, useState, type ReactNode } from "react";
import { Markdown } from "@/components/blocks/content/markdown";
import { cn } from "@/lib/cn";

/** Field errors keyed by dotted path, e.g. "cards.0.front". */
export type Errors = Record<string, string>;

const control =
  "w-full rounded-md border-2 bg-surface px-3 text-small text-text placeholder:text-muted/70";
const border = (error?: string) =>
  error ? "border-danger" : "border-surface-2 focus:border-lime";

/** Empty text becomes undefined, so optional fields validate. */
export const optional = (value: string) => (value.trim() ? value : undefined);

function Label({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-bold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[12px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") ||
  undefined;

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "h-9", border(error))}
      />
    </Label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  error,
  hint,
  rows = 3,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  rows?: number;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "resize-y py-2", border(error))}
      />
    </Label>
  );
}

/** A Markdown textarea with a live preview, rendered like the lesson. */
export function MarkdownField({
  label,
  value,
  onChange,
  error,
  rows = 6,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
}) {
  const [showPreview, setShowPreview] = useState(true);
  return (
    <div className="flex flex-col gap-2">
      <TextArea
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        rows={rows}
        hint="Markdown: **bold**, _italic_, - lists, 1. numbered lists, [links](https://…)."
      />
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        aria-expanded={showPreview}
        className="w-fit text-[12px] font-bold text-muted hover:text-text"
      >
        {showPreview ? "Hide preview" : "Show preview"}
      </button>
      {showPreview && (
        <div
          aria-label="Preview"
          role="region"
          className="rounded-md border border-dashed border-surface-2 p-3"
        >
          {value?.trim() ? (
            <Markdown className="text-body">{value}</Markdown>
          ) : (
            <p className="text-small text-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  hint,
}: {
  label: ReactNode;
  value: T | undefined;
  options: Array<{ value: T | ""; label: string }>;
  onChange: (value: T | undefined) => void;
  error?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) =>
          onChange((e.target.value || undefined) as T | undefined)
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "h-9", border(error))}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

/** Moves item `from` to `to` in a copy of the list. */
export function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * A list of repeated items (cards, tabs, questions…) with add, remove and
 * move up/down. Keeps at least `min` items.
 */
export function RepeatableList<T>({
  legend,
  itemLabel,
  items,
  onChange,
  create,
  render,
  error,
  min = 1,
  max,
}: {
  legend: string;
  /** "Card", "Tab"… used in button names: "Remove card 2". */
  itemLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => NoInfer<T>;
  render: (item: T, update: (item: T) => void, index: number) => ReactNode;
  /** An error about the list itself, e.g. "Too small". */
  error?: string;
  min?: number;
  /** Hides "Add" once there are this many. */
  max?: number;
}) {
  const lower = itemLabel.toLowerCase();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-small font-bold">{legend}</legend>
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-md border border-surface-2 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-label text-muted">
              {itemLabel} {index + 1}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange(move(items, index, index - 1))}
                disabled={index === 0}
                aria-label={`Move ${lower} ${index + 1} up`}
                className="rounded px-2 py-0.5 text-small text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onChange(move(items, index, index + 1))}
                disabled={index === items.length - 1}
                aria-label={`Move ${lower} ${index + 1} down`}
                className="rounded px-2 py-0.5 text-small text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                disabled={items.length <= min}
                aria-label={`Remove ${lower} ${index + 1}`}
                className="rounded px-2 py-0.5 text-small text-danger hover:bg-surface-2 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          </div>
          {render(
            item,
            (updated) =>
              onChange(
                items.map((existing, i) => (i === index ? updated : existing)),
              ),
            index,
          )}
        </div>
      ))}
      {(max === undefined || items.length < max) && (
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="w-fit rounded-md border border-dashed border-surface-2 px-3 py-1.5 text-small font-bold text-muted hover:border-muted hover:text-text"
        >
          + Add {lower}
        </button>
      )}
    </fieldset>
  );
}

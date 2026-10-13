import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Defaults to an empty-box icon. */
  icon?: ReactNode;
  /** Usually a Button. */
  action?: ReactNode;
  /** Heading level to fit the surrounding outline. */
  headingLevel?: "h2" | "h3";
  className?: string;
};

function EmptyBoxIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-surface-2 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-16 place-items-center rounded-pill bg-surface-2 text-lime">
        {icon ?? <EmptyBoxIcon />}
      </div>
      <Heading className="text-h3">{title}</Heading>
      {description && (
        <p className="max-w-sm text-body text-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

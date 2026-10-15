import type { ReactNode } from "react";

/** One headline number, e.g. "Volunteers 48". */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  /** Small line under the number, e.g. "12 this week". */
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-surface-2 bg-surface p-4">
      <span className="text-label text-muted">{label}</span>
      <span className="text-h2 tabular-nums">{value}</span>
      {hint && <span className="text-small text-muted">{hint}</span>}
    </div>
  );
}

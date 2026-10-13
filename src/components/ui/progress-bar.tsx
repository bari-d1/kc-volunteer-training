import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Module progress". */
  label: string;
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={`${Math.round(percent)}%`}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-pill bg-surface-2",
        className,
      )}
    >
      <div
        className="h-full rounded-pill bg-lime transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

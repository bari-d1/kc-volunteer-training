import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CourseModule, ModuleStatus } from "@/lib/mock-course";

const statusLabels: Record<ModuleStatus, string> = {
  completed: "Completed",
  "in-progress": "In progress",
  locked: "Locked",
};

export function ModuleStatusIcon({ status }: { status: ModuleStatus }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    "aria-hidden": true,
    className: "shrink-0",
  } as const;

  if (status === "completed") {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="9" className="fill-lime" />
        <path
          d="M6 10.5l2.5 2.5L14 7.5"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ink"
        />
      </svg>
    );
  }

  if (status === "in-progress") {
    return (
      <svg {...common}>
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2"
          className="stroke-lime"
        />
        <path d="M10 4a6 6 0 0 1 0 12z" className="fill-lime" />
      </svg>
    );
  }

  return (
    <svg {...common} className="shrink-0 text-muted">
      <rect x="4.5" y="9" width="11" height="8" rx="2" fill="currentColor" />
      <path
        d="M7 9V6.5a3 3 0 0 1 6 0V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export type ModuleListProps = {
  modules: CourseModule[];
  currentModuleId: string;
  /** Icon-only rail; titles stay available to screen readers and as tooltips. */
  collapsed?: boolean;
  /** Called after a module link is chosen, e.g. to close the drawer. */
  onNavigate?: () => void;
};

export function ModuleList({
  modules,
  currentModuleId,
  collapsed = false,
  onNavigate,
}: ModuleListProps) {
  return (
    <ol className="flex flex-col gap-1">
      {modules.map((module, index) => {
        const current = module.id === currentModuleId;
        const locked = module.status === "locked";
        const className = cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-small transition-colors",
          collapsed && "justify-center px-0",
          current
            ? "bg-lime font-bold text-ink [&_.fill-lime]:fill-ink [&_.stroke-lime]:stroke-ink"
            : locked
              ? "text-muted"
              : "hover:bg-surface-2",
        );
        const content = (
          <>
            <ModuleStatusIcon status={module.status} />
            <span className={cn("flex-1", collapsed && "sr-only")}>
              <span className="tabular-nums">{index + 1}. </span>
              {module.title}
            </span>
            <span className="sr-only">, {statusLabels[module.status]}</span>
          </>
        );

        return (
          <li key={module.id}>
            {locked ? (
              <span
                className={className}
                title={collapsed ? module.title : undefined}
              >
                {content}
              </span>
            ) : (
              <Link
                // Every unlocked module previews the same lesson for now.
                href="/preview/lesson"
                aria-current={current ? "page" : undefined}
                title={collapsed ? module.title : undefined}
                onClick={onNavigate}
                className={className}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

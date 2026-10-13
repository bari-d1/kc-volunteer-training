import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DashboardCard, DashboardStatus } from "@/lib/dashboard";

const statusLabel: Record<DashboardStatus, string> = {
  locked: "Locked",
  available: "Ready to start",
  "in-progress": "In progress",
  completed: "Completed",
};

function StatusIcon({ status }: { status: DashboardStatus }) {
  if (status === "completed") {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="12" className="fill-lime" />
        <path
          d="M7 12.5l3 3 7-7"
          fill="none"
          stroke="#191919"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "locked") {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="shrink-0 text-muted"
      >
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2.5"
          fill="currentColor"
        />
        <path
          d="M8 11V8a4 4 0 0 1 8 0v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="shrink-0"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2.5"
          className="stroke-lime"
        />
        <path d="M12 5a7 7 0 0 1 0 14z" className="fill-lime" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="2.5"
        className="stroke-muted"
      />
    </svg>
  );
}

export function ModuleCard({
  card,
  href,
}: {
  card: DashboardCard;
  href: string;
}) {
  const locked = card.status === "locked";
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "text-h2 font-extrabold tabular-nums",
            locked ? "text-muted" : "text-lime",
          )}
        >
          {String(card.number).padStart(2, "0")}
        </span>
        <StatusIcon status={card.status} />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className={cn("text-h3", locked && "text-muted")}>{card.title}</h3>
        {card.summary && (
          <p className="text-small text-muted">{card.summary}</p>
        )}
      </div>
      <p
        className={cn(
          "text-label",
          card.status === "completed" ? "text-lime" : "text-muted",
        )}
      >
        {statusLabel[card.status]}
      </p>
      {locked && (
        <p className="text-small text-muted">
          Finish the previous module to unlock.
        </p>
      )}
    </>
  );

  const base =
    "flex h-full flex-col gap-5 rounded-md bg-surface p-6 shadow-card";
  if (locked) {
    return (
      <div
        className={cn(
          base,
          "border-2 border-dashed border-surface-2 bg-surface/60",
        )}
      >
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        base,
        "border-2 border-transparent transition-[background-color,border-color,translate] hover:-translate-y-0.5 hover:border-surface-2 hover:bg-surface-2 motion-reduce:hover:translate-y-0",
        card.status === "in-progress" && "border-lime/60",
      )}
    >
      {body}
    </Link>
  );
}

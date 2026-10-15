"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data-table";
import { cn } from "@/lib/cn";
import { STATUS_LABELS, type VolunteerStatus } from "@/lib/volunteer-status";
import type { VolunteerRow } from "@/server/admin/volunteers";

const date = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});
const branchName = (code: string | null) =>
  code ? code.charAt(0) + code.slice(1).toLowerCase() : "Not sure yet";

const STATUS_ORDER: Record<VolunteerStatus, number> = {
  "not-started": 0,
  "in-progress": 1,
  "quiz-failed": 2,
  completed: 3,
};
const STATUS_STYLE: Record<VolunteerStatus, string> = {
  "not-started": "bg-surface-2 text-muted",
  "in-progress": "bg-surface-2 text-text",
  "quiz-failed": "bg-danger/15 text-danger",
  completed: "bg-lime text-ink",
};

export function statusText(row: VolunteerRow) {
  return row.status === "in-progress"
    ? `In progress ${row.completedModules}/${row.totalModules}`
    : STATUS_LABELS[row.status];
}

const columns: Column<VolunteerRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (v) => (
      <Link
        href={`/admin/volunteers/${v.id}`}
        className="font-bold text-text underline-offset-4 hover:text-lime hover:underline"
      >
        {v.firstName} {v.lastName}
      </Link>
    ),
    sortValue: (v) => `${v.firstName} ${v.lastName}`,
  },
  { key: "email", header: "Email", sortValue: (v) => v.email },
  {
    key: "branch",
    header: "Branch and team",
    render: (v) =>
      v.teamInterest
        ? `${branchName(v.branchInterest)} · ${v.teamInterest}`
        : branchName(v.branchInterest),
    sortValue: (v) => v.branchInterest ?? "~",
  },
  {
    key: "status",
    header: "Status",
    render: (v) => (
      <span
        className={cn(
          "inline-block rounded-pill px-2 py-0.5 text-[12px] font-bold whitespace-nowrap",
          STATUS_STYLE[v.status],
        )}
      >
        {statusText(v)}
      </span>
    ),
    sortValue: (v) => STATUS_ORDER[v.status] * 100 + v.completedModules,
  },
  {
    key: "score",
    header: "Best score",
    align: "right",
    render: (v) =>
      v.bestScore ? `${v.bestScore.score}/${v.bestScore.total}` : "–",
    sortValue: (v) =>
      v.bestScore ? v.bestScore.score / v.bestScore.total : null,
  },
  {
    key: "joined",
    header: "Signed up",
    render: (v) => date.format(v.createdAt),
    sortValue: (v) => v.createdAt,
  },
  {
    key: "active",
    header: "Last active",
    render: (v) => date.format(v.lastActive),
    sortValue: (v) => v.lastActive,
  },
];

export function VolunteersTable({ rows }: { rows: VolunteerRow[] }) {
  return (
    <DataTable
      caption="Volunteers"
      rows={rows}
      columns={columns}
      rowKey={(v) => v.id}
      initialSort={{ key: "joined", direction: "desc" }}
      emptyTitle="No volunteers match"
      emptyDescription="Try clearing the filters."
    />
  );
}

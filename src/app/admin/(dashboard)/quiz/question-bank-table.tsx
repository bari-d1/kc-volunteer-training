"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { cn } from "@/lib/cn";
import { HARD_MAX_PERCENT, HARD_MIN_ANSWERS } from "@/lib/question-bank-edit";
import type { QuestionBankRow } from "@/server/admin/quiz";

const control =
  "h-10 rounded-md border-2 border-surface-2 bg-surface px-3 text-small text-text focus:border-lime";

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "lime" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill px-2 py-0.5 text-[12px] font-bold whitespace-nowrap",
        tone === "lime" && "bg-lime text-ink",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "muted" && "bg-surface-2 text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function CorrectRate({ row }: { row: QuestionBankRow }) {
  if (row.percentCorrect === null) return <span className="text-muted">–</span>;
  return (
    <span className={cn(row.hard && "font-bold text-danger")}>
      {row.percentCorrect}%
      {row.hard && <span className="sr-only"> (hard)</span>}
    </span>
  );
}

const columns: Column<QuestionBankRow>[] = [
  {
    key: "id",
    header: "ID",
    render: (q) => (
      <Link
        href={`/admin/quiz/${q.id}`}
        className="font-bold text-text underline-offset-4 hover:text-lime hover:underline"
      >
        {q.id}
      </Link>
    ),
    sortValue: (q) => Number(q.id.slice(1)),
  },
  {
    key: "prompt",
    header: "Question",
    render: (q) => <span className="line-clamp-2 max-w-md">{q.prompt}</span>,
    sortValue: (q) => q.prompt,
  },
  {
    key: "topic",
    header: "Topic",
    render: (q) => q.topicTitle,
    sortValue: (q) => q.topicTitle,
  },
  {
    key: "group",
    header: "Group",
    render: (q) => q.group ?? <span className="text-muted">–</span>,
    sortValue: (q) => q.group,
  },
  {
    key: "status",
    header: "Status",
    render: (q) => (
      <span className="flex flex-wrap gap-1">
        {q.active ? <Badge tone="lime">Active</Badge> : <Badge>Inactive</Badge>}
        {q.required && <Badge>Required</Badge>}
      </span>
    ),
    sortValue: (q) => (q.active ? 0 : 2) + (q.required ? 0 : 1),
  },
  {
    key: "shown",
    header: "Shown",
    align: "right",
    render: (q) => q.shown,
    sortValue: (q) => q.shown,
  },
  {
    key: "correct",
    header: "Correct",
    align: "right",
    render: (q) => <CorrectRate row={q} />,
    sortValue: (q) => q.percentCorrect,
  },
];

type Filters = {
  topic: string;
  group: string;
  status: "" | "active" | "inactive";
  hard: boolean;
};
const NO_FILTERS: Filters = { topic: "", group: "", status: "", hard: false };

/** The question bank with filters; sorting and search come from DataTable. */
export function QuestionBankTable({
  questions,
  sections,
}: {
  questions: QuestionBankRow[];
  sections: Array<{ topic: string; title: string }>;
}) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const set = (change: Partial<Filters>) =>
    setFilters({ ...filters, ...change });
  const groups = useMemo(
    () => [...new Set(questions.flatMap((q) => q.group ?? []))].sort(),
    [questions],
  );
  const rows = useMemo(
    () =>
      questions.filter(
        (q) =>
          (!filters.topic || q.topic === filters.topic) &&
          (!filters.group ||
            (filters.group === "none"
              ? !q.group
              : q.group === filters.group)) &&
          (!filters.status || q.active === (filters.status === "active")) &&
          (!filters.hard || q.hard),
      ),
    [questions, filters],
  );
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Filter questions"
        className="flex flex-wrap items-end gap-3 rounded-md border border-surface-2 bg-surface p-3"
      >
        <label className="flex flex-col gap-1 text-small font-bold text-muted">
          Topic
          <select
            value={filters.topic}
            onChange={(e) => set({ topic: e.target.value })}
            className={control}
          >
            <option value="">Any</option>
            {sections.map((s) => (
              <option key={s.topic} value={s.topic}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-bold text-muted">
          Group
          <select
            value={filters.group}
            onChange={(e) => set({ group: e.target.value })}
            className={control}
          >
            <option value="">Any</option>
            <option value="none">No group</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-bold text-muted">
          Status
          <select
            value={filters.status}
            onChange={(e) =>
              set({ status: e.target.value as Filters["status"] })
            }
            className={control}
          >
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label
          className="flex h-10 items-center gap-2 text-small font-bold"
          title={`Under ${HARD_MAX_PERCENT}% correct, with at least ${HARD_MIN_ANSWERS} answers`}
        >
          <input
            type="checkbox"
            checked={filters.hard}
            onChange={(e) => set({ hard: e.target.checked })}
            className="size-4 accent-lime"
          />
          Hard questions only
          <span className="sr-only">
            (under {HARD_MAX_PERCENT}% correct, at least {HARD_MIN_ANSWERS}{" "}
            answers)
          </span>
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className="inline-flex h-10 items-center px-3 text-small font-bold text-muted hover:text-text"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-small text-muted" aria-live="polite">
        {filtered
          ? `${rows.length} of ${questions.length} questions`
          : `${questions.length} questions`}
        . Shown and correct count submitted attempts.
      </p>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(q) => q.id}
        caption="Question bank"
        searchText={(q) => `${q.id} ${q.prompt} ${q.group ?? ""}`}
        searchLabel="Search questions"
        pageSize={50}
        initialSort={{ key: "id", direction: "asc" }}
        emptyTitle={filtered ? "No questions match" : "No questions yet"}
        emptyDescription={
          filtered ? "Try clearing the filters." : "Add one, or import a bank."
        }
      />
    </div>
  );
}

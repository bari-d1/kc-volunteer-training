"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<Row> = {
  key: string;
  header: string;
  /** What the cell shows. Defaults to row[key]. */
  render?: (row: Row) => ReactNode;
  /** Sort by this value; omit to make the column unsortable. */
  sortValue?: (row: Row) => string | number | Date | null | undefined;
  /** Right-align numbers. */
  align?: "left" | "right";
};

type Sort = { key: string; direction: "asc" | "desc" };

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-GB", { sensitivity: "base" });
}

/**
 * A table with sortable columns, a search box and pages. Sorting, searching
 * and paging happen in the browser, which suits KC-sized lists (hundreds of
 * rows, not millions).
 */
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  searchText,
  searchLabel = "Search",
  pageSize = 25,
  initialSort,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  caption,
}: {
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  /** Text to match the search box against; omit to hide the search box. */
  searchText?: (row: Row) => string;
  searchLabel?: string;
  pageSize?: number;
  initialSort?: Sort;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  /** Accessible name for the table. */
  caption: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort | null>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched =
      needle && searchText
        ? rows.filter((row) => searchText(row).toLowerCase().includes(needle))
        : rows;
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return matched;
    const value = column.sortValue;
    const sign = sort.direction === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => sign * compare(value(a), value(b)));
  }, [rows, columns, query, sort, searchText]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * pageSize, (current + 1) * pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((previous) =>
      previous?.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {searchText && (
        <div className="flex flex-col gap-1 sm:w-80">
          <label htmlFor={`${id}-search`} className="sr-only">
            {searchLabel}
          </label>
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={`${searchLabel}…`}
            className="h-10 w-full rounded-md border-2 border-surface-2 bg-surface px-3 text-small text-text placeholder:text-muted/70 focus:border-lime"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-md border border-dashed border-surface-2 p-8 text-center"
        >
          <span className="text-body font-bold">
            {query ? "No matches" : emptyTitle}
          </span>
          <span className="text-small text-muted">
            {query ? `Nothing matches “${query}”.` : emptyDescription}
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-surface-2">
          <table className="w-full border-collapse text-small">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-surface">
              <tr>
                {columns.map((column) => {
                  const sorted = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        sorted
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={cn(
                        "px-3 py-2 font-bold whitespace-nowrap text-muted",
                        column.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="inline-flex items-center gap-1 hover:text-text"
                        >
                          {column.header}
                          <span aria-hidden="true" className="text-[10px]">
                            {sorted
                              ? sort.direction === "asc"
                                ? "▲"
                                : "▼"
                              : "↕"}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-t border-surface-2 hover:bg-surface/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2 align-top",
                        column.align === "right" && "text-right tabular-nums",
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(
                            (row as Record<string, unknown>)[column.key] ?? "",
                          )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > pageSize && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-3 text-small text-muted"
        >
          <span aria-live="polite">
            {current * pageSize + 1}–
            {Math.min((current + 1) * pageSize, visible.length)} of{" "}
            {visible.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="rounded-md border border-surface-2 px-3 py-1.5 font-bold text-text hover:bg-surface-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              className="rounded-md border border-surface-2 px-3 py-1.5 font-bold text-text hover:bg-surface-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

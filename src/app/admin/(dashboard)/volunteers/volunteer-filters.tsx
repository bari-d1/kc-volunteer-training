import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  INACTIVE_DAYS,
  STATUS_LABELS,
  type VolunteerFilters,
} from "@/lib/volunteer-status";

const BRANCHES = [
  ["EXPERIENCE", "Experience"],
  ["MINISTRY", "Ministry"],
  ["CREATIVE", "Creative"],
  ["SYSTEMS", "Systems"],
  ["none", "Not sure yet"],
] as const;

const control =
  "h-10 rounded-md border-2 border-surface-2 bg-surface px-3 text-small text-text focus:border-lime";

/**
 * Search and filters as a plain GET form, so the URL holds them and the
 * CSV export uses exactly the same view.
 */
export function VolunteerFiltersForm({
  filters,
}: {
  filters: VolunteerFilters;
}) {
  const active =
    filters.q || filters.status || filters.branch || filters.inactive;
  return (
    <form
      method="get"
      action="/admin/volunteers"
      role="search"
      aria-label="Filter volunteers"
      className="flex flex-wrap items-end gap-3 rounded-md border border-surface-2 bg-surface p-3"
    >
      <label className="flex flex-col gap-1 text-small font-bold text-muted">
        Name or email
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search…"
          className={`${control} w-56 placeholder:text-muted/70`}
        />
      </label>
      <label className="flex flex-col gap-1 text-small font-bold text-muted">
        Status
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={control}
        >
          <option value="">Any</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-small font-bold text-muted">
        Branch
        <select
          name="branch"
          defaultValue={filters.branch ?? ""}
          className={control}
        >
          <option value="">Any</option>
          {BRANCHES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex h-10 items-center gap-2 text-small font-bold">
        <input
          type="checkbox"
          name="inactive"
          value="1"
          defaultChecked={filters.inactive}
          className="size-4 accent-lime"
        />
        Inactive for {INACTIVE_DAYS}+ days
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
        {active && (
          <Link
            href="/admin/volunteers"
            className="inline-flex h-9 items-center px-3 text-small font-bold text-muted hover:text-text"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

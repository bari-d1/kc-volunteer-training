/** Where a volunteer is with the course, for the admin volunteer list. */
export type VolunteerStatus =
  "not-started" | "in-progress" | "quiz-failed" | "completed";

export const STATUS_LABELS: Record<VolunteerStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "quiz-failed": "Quiz failed",
  completed: "Completed",
};

/**
 * Completed once they have a certificate; Quiz failed if they've submitted
 * attempts but not passed; In progress with any module completed; else
 * Not started.
 */
export function volunteerStatus({
  hasCertificate,
  submittedAttempts,
  completedModules,
}: {
  hasCertificate: boolean;
  submittedAttempts: number;
  completedModules: number;
}): VolunteerStatus {
  if (hasCertificate) return "completed";
  if (submittedAttempts > 0) return "quiz-failed";
  if (completedModules > 0) return "in-progress";
  return "not-started";
}

export const INACTIVE_DAYS = 14;

export type VolunteerFilters = {
  /** Matches name or email. */
  q?: string;
  status?: VolunteerStatus;
  /** A BranchCode, or "none" for "Not sure yet". */
  branch?: string;
  /** Not completed and nothing done for INACTIVE_DAYS or more. */
  inactive?: boolean;
};

const STATUSES = new Set<string>(Object.keys(STATUS_LABELS));

/** Filters from the URL (?q=&status=&branch=&inactive=1), ignoring junk. */
export function parseVolunteerFilters(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): VolunteerFilters {
  const get = (key: string) => {
    const value =
      params instanceof URLSearchParams ? params.get(key) : params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const status = get("status");
  const branch = get("branch");
  return {
    q: get("q")?.slice(0, 100),
    status:
      status && STATUSES.has(status) ? (status as VolunteerStatus) : undefined,
    branch:
      branch &&
      ["EXPERIENCE", "MINISTRY", "CREATIVE", "SYSTEMS", "none"].includes(branch)
        ? branch
        : undefined,
    inactive: get("inactive") === "1",
  };
}

/** The same filters as a query string, for the CSV export link. */
export function filtersToQuery(filters: VolunteerFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.inactive) params.set("inactive", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

type Filterable = {
  firstName: string;
  lastName: string;
  email: string;
  branchInterest: string | null;
  status: VolunteerStatus;
  lastActive: Date;
};

export function matchesFilters(
  row: Filterable,
  filters: VolunteerFilters,
  now = new Date(),
) {
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack =
      `${row.firstName} ${row.lastName} ${row.email}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (filters.status && row.status !== filters.status) return false;
  if (filters.branch) {
    const branch = row.branchInterest ?? "none";
    if (branch !== filters.branch) return false;
  }
  if (filters.inactive) {
    if (row.status === "completed") return false;
    const days = (now.getTime() - row.lastActive.getTime()) / 86_400_000;
    if (days < INACTIVE_DAYS) return false;
  }
  return true;
}

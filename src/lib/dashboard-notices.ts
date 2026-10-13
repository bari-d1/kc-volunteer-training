/**
 * One-off messages the dashboard shows from ?notice=…. Plain module (not
 * "use client") so the server page can validate the param.
 */
export const dashboardNotices = {
  locked: {
    title: "Finish the previous module first",
    variant: "info" as const,
  },
};

export type DashboardNoticeKey = keyof typeof dashboardNotices;

export function isDashboardNotice(value: unknown): value is DashboardNoticeKey {
  return typeof value === "string" && Object.hasOwn(dashboardNotices, value);
}

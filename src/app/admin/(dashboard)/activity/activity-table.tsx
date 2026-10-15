"use client";

import { DataTable, type Column } from "@/components/admin/data-table";

export type ActivityRow = {
  id: string;
  entity: string;
  action: string;
  summary: string;
  createdAt: Date;
};

const when = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const columns: Column<ActivityRow>[] = [
  {
    key: "when",
    header: "When",
    render: (r) => when.format(r.createdAt),
    sortValue: (r) => r.createdAt,
  },
  { key: "summary", header: "Change", sortValue: (r) => r.summary },
  { key: "entity", header: "Area", sortValue: (r) => r.entity },
  { key: "action", header: "Action", sortValue: (r) => r.action },
];

export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <DataTable
      caption="Recent admin changes"
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      searchText={(r) => `${r.summary} ${r.entity} ${r.action}`}
      searchLabel="Search changes"
      initialSort={{ key: "when", direction: "desc" }}
      emptyTitle="No changes yet"
      emptyDescription="Edits made in the admin area are listed here."
    />
  );
}

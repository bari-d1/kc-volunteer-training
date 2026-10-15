"use client";

import { DataTable, type Column } from "@/components/admin/data-table";

export type VolunteerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchInterest: string | null;
  teamInterest: string | null;
  createdAt: Date;
  modulesCompleted: number;
  certificates: number;
};

const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const branch = (code: string | null) =>
  code ? code.charAt(0) + code.slice(1).toLowerCase() : "Not sure yet";

const columns: Column<VolunteerRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (v) => `${v.firstName} ${v.lastName}`,
    sortValue: (v) => `${v.firstName} ${v.lastName}`,
  },
  { key: "email", header: "Email", sortValue: (v) => v.email },
  {
    key: "branch",
    header: "Branch",
    render: (v) =>
      v.teamInterest
        ? `${branch(v.branchInterest)} · ${v.teamInterest}`
        : branch(v.branchInterest),
    sortValue: (v) => v.branchInterest ?? "",
  },
  {
    key: "modules",
    header: "Modules done",
    align: "right",
    render: (v) => v.modulesCompleted,
    sortValue: (v) => v.modulesCompleted,
  },
  {
    key: "certificate",
    header: "Certificate",
    render: (v) => (v.certificates > 0 ? "Yes" : "–"),
    sortValue: (v) => v.certificates,
  },
  {
    key: "joined",
    header: "Joined",
    render: (v) => date.format(v.createdAt),
    sortValue: (v) => v.createdAt,
  },
];

export function VolunteersTable({ rows }: { rows: VolunteerRow[] }) {
  return (
    <DataTable
      caption="Volunteers"
      rows={rows}
      columns={columns}
      rowKey={(v) => v.id}
      searchText={(v) =>
        `${v.firstName} ${v.lastName} ${v.email} ${v.teamInterest ?? ""}`
      }
      searchLabel="Search volunteers"
      initialSort={{ key: "joined", direction: "desc" }}
      emptyTitle="No volunteers yet"
      emptyDescription="Volunteers appear here once they've signed up."
    />
  );
}

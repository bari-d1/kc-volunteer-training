import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import {
  filtersToQuery,
  parseVolunteerFilters,
  type VolunteerFilters,
} from "@/lib/volunteer-status";
import { listVolunteerRows } from "@/server/admin/volunteers";
import { VolunteerFiltersForm } from "./volunteer-filters";
import { VolunteersTable } from "./volunteers-table";

export const metadata: Metadata = { title: "Volunteers" };

export default function AdminVolunteersPage({
  searchParams,
}: PageProps<"/admin/volunteers">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {searchParams.then((params) => (
        <Volunteers filters={parseVolunteerFilters(params)} />
      ))}
    </Suspense>
  );
}

async function Volunteers({ filters }: { filters: VolunteerFilters }) {
  await requireAdmin();
  const rows = await listVolunteerRows(filters);
  return (
    <>
      <PageHeader
        title="Volunteers"
        description={`${rows.length} volunteer${rows.length === 1 ? "" : "s"}${
          filtersToQuery(filters) ? " match these filters" : ""
        }.`}
        actions={
          <Button
            href={`/api/admin/volunteers/export${filtersToQuery(filters)}`}
            prefetch={false}
            download
            variant="secondary"
            size="sm"
          >
            Export CSV
          </Button>
        }
      />
      <VolunteerFiltersForm filters={filters} />
      <VolunteersTable rows={rows} />
    </>
  );
}

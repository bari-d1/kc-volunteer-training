import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { listVolunteers } from "@/server/admin/volunteers";
import { VolunteersTable } from "./volunteers-table";

export const metadata: Metadata = { title: "Volunteers" };

export default function AdminVolunteersPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Volunteers />
    </Suspense>
  );
}

async function Volunteers() {
  await requireAdmin();
  const volunteers = await listVolunteers();
  return (
    <>
      <PageHeader
        title="Volunteers"
        description={`${volunteers.length} signed up.`}
      />
      <VolunteersTable rows={volunteers} />
    </>
  );
}

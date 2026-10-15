import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "People & Teams" };

export default function AdminPeopleTeamsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <PeopleTeams />
    </Suspense>
  );
}

async function PeopleTeams() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="People & Teams"
        description="Leaders, branches and teams."
      />
      <EmptyState
        title="Coming soon"
        description="This part of the admin area is next on the list."
      />
    </>
  );
}

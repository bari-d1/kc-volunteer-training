import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { listRecentChanges } from "@/server/admin/volunteers";
import { ActivityTable } from "./activity-table";

export const metadata: Metadata = { title: "Activity" };

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Activity />
    </Suspense>
  );
}

async function Activity() {
  await requireAdmin();
  const changes = await listRecentChanges(200);
  return (
    <>
      <PageHeader
        title="Activity"
        description="The latest 200 changes made in the admin area."
      />
      <ActivityTable rows={changes} />
    </>
  );
}

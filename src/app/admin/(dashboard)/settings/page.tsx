import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Safeguarding contacts, links and other site settings."
      />
      <EmptyState
        title="Coming soon"
        description="This part of the admin area is next on the list."
      />
    </>
  );
}

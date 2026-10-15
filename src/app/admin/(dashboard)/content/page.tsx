import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Content"
        description="Edit modules and their lessons."
      />
      <EmptyState
        title="Coming soon"
        description="This part of the admin area is next on the list."
      />
    </>
  );
}

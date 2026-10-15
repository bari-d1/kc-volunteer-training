import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Quiz" };

export default function AdminQuizPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Quiz />
    </Suspense>
  );
}

async function Quiz() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Quiz"
        description="Manage the question bank and quiz settings."
      />
      <EmptyState
        title="Coming soon"
        description="This part of the admin area is next on the list."
      />
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import questions" };

export default function AdminQuizImportPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <QuizImport />
    </Suspense>
  );
}

async function QuizImport() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Import questions"
        description="Upload a question bank JSON file, like content/quizzes/volunteers-onboarding.json. You'll see what changes before anything is saved."
      />
      <ImportForm />
    </>
  );
}

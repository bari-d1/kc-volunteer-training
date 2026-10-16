import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { requireAdmin } from "@/lib/admin-auth";
import { getQuestionEditor } from "@/server/admin/quiz";
import { QuestionEditorPage } from "../question-editor";

export const metadata: Metadata = { title: "Edit question" };

export default function AdminQuestionPage({
  params,
}: PageProps<"/admin/quiz/[questionId]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {params.then(({ questionId }) => (
        <EditQuestion id={questionId} />
      ))}
    </Suspense>
  );
}

async function EditQuestion({ id }: { id: string }) {
  await requireAdmin();
  const editor = await getQuestionEditor(decodeURIComponent(id));
  if (!editor) notFound();
  return <QuestionEditorPage key={id} editor={editor} />;
}

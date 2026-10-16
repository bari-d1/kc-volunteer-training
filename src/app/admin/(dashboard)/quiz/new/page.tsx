import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { requireAdmin } from "@/lib/admin-auth";
import { getQuestionEditor } from "@/server/admin/quiz";
import { QuestionEditorPage } from "../question-editor";

export const metadata: Metadata = { title: "Add question" };

const one = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

export default function AdminNewQuestionPage({
  searchParams,
}: PageProps<"/admin/quiz/new">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {searchParams.then((params) => (
        <NewQuestion
          defaults={{ topic: one(params.topic), group: one(params.group) }}
        />
      ))}
    </Suspense>
  );
}

async function NewQuestion({
  defaults,
}: {
  defaults: { topic?: string; group?: string };
}) {
  await requireAdmin();
  const editor = (await getQuestionEditor(null))!;
  const topic = editor.sections.some((s) => s.topic === defaults.topic)
    ? defaults.topic
    : undefined;
  return (
    <QuestionEditorPage editor={editor} defaults={{ ...defaults, topic }} />
  );
}

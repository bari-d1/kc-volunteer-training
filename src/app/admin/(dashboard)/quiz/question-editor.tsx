import { PageHeader } from "@/components/admin/page-header";
import type { getQuestionEditor } from "@/server/admin/quiz";
import { QuestionForm } from "./question-form";

type Editor = NonNullable<Awaited<ReturnType<typeof getQuestionEditor>>>;

/** The add and edit pages: header, stats and the form. */
export function QuestionEditorPage({
  editor,
  defaults,
}: {
  editor: Editor;
  defaults?: { topic?: string; group?: string };
}) {
  const { stats } = editor;
  return (
    <>
      <PageHeader
        title={
          editor.question ? `Edit ${editor.id}` : `Add question ${editor.id}`
        }
        description="Changes apply to new attempts. Attempts already started keep the question as it was."
      />
      {stats && (
        <p className="text-small text-muted">
          {stats.shown === 0 ? (
            "Not in a submitted attempt yet."
          ) : (
            <>
              Shown in {stats.shown} submitted attempt
              {stats.shown === 1 ? "" : "s"},{" "}
              <span
                className={stats.hard ? "font-bold text-danger" : undefined}
              >
                {stats.percentCorrect}% answered correctly
              </span>
              {stats.hard && ". Under half get it right: is it clear?"}
            </>
          )}
        </p>
      )}
      <QuestionForm
        id={editor.id}
        question={editor.question}
        defaults={defaults}
        sections={editor.sections}
        groups={editor.groups}
        used={editor.used}
      />
    </>
  );
}

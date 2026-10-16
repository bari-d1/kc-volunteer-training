"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import type { ImportPreview } from "@/server/admin/quiz";
import { applyImportAction, previewImportAction } from "../actions";

function ChangeList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; prompt: string; changed?: string[] }>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-body font-bold">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-small text-muted">None.</p>
      ) : (
        <ul className="flex flex-col rounded-md border border-surface-2">
          {items.map((q) => (
            <li
              key={q.id}
              className="flex flex-col gap-0.5 border-t border-surface-2 px-3 py-2 text-small first:border-t-0"
            >
              <span>
                <span className="font-bold">{q.id}</span> {q.prompt}
              </span>
              {q.changed && (
                <span className="text-muted">
                  Changed: {q.changed.join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Pick a file → dry run → confirm, using the same importer as the CLI. */
export function ImportForm() {
  const router = useRouter();
  const save = useSaveToast();
  const fileId = useId();
  const [json, setJson] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [problem, setProblem] = useState<{
    error: string;
    problems: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (file: File | undefined) => {
    setPreview(null);
    setProblem(null);
    setJson(null);
    if (!file) return;
    setFileName(file.name);
    startTransition(async () => {
      const text = await file.text();
      const result = await previewImportAction(text);
      if (result.ok) {
        setJson(text);
        setPreview(result.data);
      } else {
        setProblem({ error: result.error, problems: result.problems ?? [] });
      }
    });
  };

  const changes =
    preview &&
    preview.questions.add.length +
      preview.questions.update.length +
      preview.questions.deactivate.length +
      preview.sections.add.length +
      preview.sections.update.length +
      preview.sections.remove.length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className="text-small font-bold">
          Question bank file (.json)
        </label>
        <input
          id={fileId}
          type="file"
          accept="application/json,.json"
          disabled={pending}
          onChange={(e) => choose(e.target.files?.[0])}
          className="text-small file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:font-bold file:text-text"
        />
        {pending && !preview && (
          <p className="text-small text-muted">Checking {fileName}…</p>
        )}
      </div>

      {problem && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-small text-danger"
        >
          <p className="font-bold">{problem.error} Nothing was imported.</p>
          {problem.problems.length > 0 && (
            <ul className="list-disc pl-5">
              {problem.problems.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <>
          <p role="status" className="text-body">
            {changes === 0
              ? `${fileName} matches the question bank: nothing to change.`
              : `Importing ${fileName} will make these changes. ${preview.questions.unchanged} questions stay as they are.`}
          </p>
          <ChangeList title="Added" items={preview.questions.add} />
          <ChangeList title="Updated" items={preview.questions.update} />
          <ChangeList
            title="Deactivated (not in the file)"
            items={preview.questions.deactivate}
          />
          {preview.sections.add.length +
            preview.sections.update.length +
            preview.sections.remove.length >
            0 && (
            <p className="text-small text-muted">
              Topics: {preview.sections.add.length} added,{" "}
              {preview.sections.update.length} updated,{" "}
              {preview.sections.remove.length} removed.
            </p>
          )}
          <p className="text-small text-muted">
            {preview.settingsChanged
              ? "The pass mark and questions per attempt will be set from the file."
              : "The pass mark and questions per attempt stay as they are in Settings."}{" "}
            Attempts already started keep their questions.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={changes === 0 || !json}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await save(() => applyImportAction(json!), {
                    success: "Question bank imported",
                  });
                  if (result.ok) router.push("/admin/quiz");
                })
              }
            >
              Import these changes
            </Button>
            <Button href="/admin/quiz" variant="ghost">
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

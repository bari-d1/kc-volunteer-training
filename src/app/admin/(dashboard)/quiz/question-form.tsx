"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  AdminCheckboxField,
  AdminSelectField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/form-fields";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  RepeatableList,
  TextInput,
  optional,
} from "@/components/admin/block-editor/fields";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { nextOptionId } from "@/lib/question-bank-edit";
import type { QuestionBankQuestion } from "@/lib/schemas/question-bank";
import { deleteQuestionAction, saveQuestionAction } from "./actions";

type Values = Omit<QuestionBankQuestion, "id" | "group"> & { group: string };

export type QuestionFormProps = {
  /** "Q12"; for a new question, the id it will get. */
  id: string;
  question: QuestionBankQuestion | null;
  /** Prefills for a new question, e.g. from "Add a variation". */
  defaults?: { topic?: string; group?: string };
  sections: Array<{ topic: string; title: string }>;
  groups: string[];
  /** Drawn in any attempt, so it can't be deleted. */
  used: boolean;
};

function initialValues(
  question: QuestionBankQuestion | null,
  defaults: QuestionFormProps["defaults"],
  sections: QuestionFormProps["sections"],
): Values {
  if (question) {
    return {
      topic: question.topic,
      group: question.group ?? "",
      prompt: question.prompt,
      options: question.options,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      required: question.required,
      active: question.active,
    };
  }
  return {
    topic: defaults?.topic ?? sections[0]?.topic ?? "",
    group: defaults?.group ?? "",
    prompt: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correctOptionId: "",
    explanation: "",
    required: false,
    active: true,
  };
}

/** Adds or edits one question, checked against the whole bank on save. */
export function QuestionForm({
  id,
  question,
  defaults,
  sections,
  groups,
  used,
}: QuestionFormProps) {
  const router = useRouter();
  const save = useSaveToast();
  const groupList = useId();
  const [values, setValues] = useState(() =>
    initialValues(question, defaults, sections),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (change: Partial<Values>) => setValues({ ...values, ...change });
  const isNew = question === null;

  const submit = () =>
    startTransition(async () => {
      const result = await save(
        () =>
          saveQuestionAction(isNew ? null : id, {
            ...values,
            group: optional(values.group)?.trim(),
          }),
        { success: isNew ? "Question added" : `${id} saved` },
      );
      if (result.ok) {
        setErrors({});
        if (isNew) router.push("/admin/quiz");
      } else {
        setErrors("fieldErrors" in result ? (result.fieldErrors ?? {}) : {});
      }
    });

  return (
    <form
      noValidate
      className="flex max-w-2xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {errors._form && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 p-3 text-small text-danger"
        >
          {errors._form}
        </p>
      )}

      <AdminTextareaField
        label="Question"
        rows={2}
        value={values.prompt}
        onChange={(e) => set({ prompt: e.target.value })}
        error={errors.prompt}
      />

      <div className="flex flex-col gap-2">
        <RepeatableList
          legend="Answers"
          itemLabel="Answer"
          items={values.options}
          min={2}
          max={6}
          error={errors.options ?? errors.correctOptionId}
          create={() => ({
            id: nextOptionId(values.options.map((o) => o.id)),
            text: "",
          })}
          onChange={(options) =>
            set({
              options,
              // Removing the correct answer leaves none chosen.
              correctOptionId: options.some(
                (o) => o.id === values.correctOptionId,
              )
                ? values.correctOptionId
                : "",
            })
          }
          render={(option, update, index) => (
            <div className="flex flex-col gap-2">
              <TextInput
                label={`Answer ${index + 1}`}
                value={option.text}
                onChange={(text) => update({ ...option, text })}
                error={errors[`options.${index}.text`]}
              />
              <label className="flex items-center gap-2 text-small">
                <input
                  type="radio"
                  name="correct"
                  checked={values.correctOptionId === option.id}
                  onChange={() => set({ correctOptionId: option.id })}
                  className="size-4 accent-lime"
                />
                <span className="font-bold">Correct answer</span>
                <span className="sr-only">: answer {index + 1}</span>
              </label>
            </div>
          )}
        />
        <p className="text-small text-muted">
          Volunteers see the answers in a random order.
        </p>
      </div>

      <AdminTextareaField
        label="Explanation (optional)"
        hint="Shown after the quiz. Without one, volunteers see “The correct answer is …”."
        rows={3}
        value={values.explanation}
        onChange={(e) => set({ explanation: e.target.value })}
        error={errors.explanation}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <AdminSelectField
          label="Topic"
          value={values.topic}
          onChange={(e) => set({ topic: e.target.value })}
          error={errors.topic}
        >
          {sections.map((s) => (
            <option key={s.topic} value={s.topic}>
              {s.title}
            </option>
          ))}
        </AdminSelectField>
        <div>
          <AdminTextField
            label="Group (optional)"
            hint="Questions in a group test the same fact, and an attempt asks one of them. Pick one or type a new name, e.g. core-values."
            list={groupList}
            value={values.group}
            onChange={(e) => set({ group: e.target.value })}
            error={errors.group}
            autoComplete="off"
          />
          <datalist id={groupList}>
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
      </div>

      <AdminCheckboxField
        label="Required"
        hint="Asked in every attempt. A group can have one required question."
        checked={values.required}
        onChange={(e) => set({ required: e.target.checked })}
        error={errors.required}
      />
      <AdminCheckboxField
        label="Active"
        hint="Can be drawn in new attempts. Untick to retire a question; its history stays."
        checked={values.active}
        onChange={(e) => set({ active: e.target.checked })}
        error={errors.active}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-2 pt-4">
        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            {isNew ? `Add ${id}` : "Save question"}
          </Button>
          <Button href="/admin/quiz" variant="ghost">
            Cancel
          </Button>
        </div>
        {!isNew &&
          (used ? (
            <p className="text-small text-muted">
              Used in an attempt, so it can’t be deleted. Untick Active to
              retire it.
            </p>
          ) : (
            <ConfirmDialog
              trigger={
                <Button variant="danger" size="sm">
                  Delete {id}
                </Button>
              }
              title={`Delete ${id}?`}
              description="No attempt has used it yet, so it can be deleted. This can't be undone."
              onConfirm={async () => {
                const result = await save(() => deleteQuestionAction(id), {
                  success: `${id} deleted`,
                });
                if (result.ok) router.push("/admin/quiz");
                return result.ok;
              }}
            />
          ))}
      </div>
    </form>
  );
}

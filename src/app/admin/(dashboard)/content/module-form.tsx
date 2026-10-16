"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AdminCheckboxField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/form-fields";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slugify";
import { createModuleAction, updateModuleAction } from "./actions";

export type ModuleFormValues = {
  title: string;
  slug: string;
  summary: string;
  narratorIntro: string;
  requiresCheck: boolean;
};

/**
 * Creates or edits a module's details. The slug follows the title until
 * it's edited by hand. New modules start unpublished.
 */
export function ModuleForm({
  courseId,
  courseSlug,
  moduleId,
  initial,
}: {
  courseId: string;
  courseSlug: string;
  /** Omit to create a new module. */
  moduleId?: string;
  initial?: ModuleFormValues;
}) {
  const router = useRouter();
  const save = useSaveToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<ModuleFormValues>(
    initial ?? {
      title: "",
      slug: "",
      summary: "",
      narratorIntro: "",
      requiresCheck: false,
    },
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(moduleId));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ModuleFormValues>(
    key: K,
    value: ModuleFormValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = {
      ...values,
      narratorIntro: values.narratorIntro.trim() || null,
    };
    startTransition(async () => {
      const result = await save(
        () =>
          moduleId
            ? updateModuleAction(moduleId, input)
            : createModuleAction(courseId, input),
        { success: moduleId ? "Module saved" : "Module created" },
      );
      if (result.ok && "data" in result) {
        setErrors({});
        // To the module's editor (its slug may have just changed).
        router.push(`/admin/content/${courseSlug}/${result.data}`);
        router.refresh();
      } else {
        setErrors("fieldErrors" in result ? (result.fieldErrors ?? {}) : {});
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-2xl flex-col gap-5"
    >
      <AdminTextField
        label="Title"
        value={values.title}
        onChange={(e) => {
          set("title", e.target.value);
          if (!slugEdited) set("slug", slugify(e.target.value));
        }}
        error={errors.title}
        required
      />
      <AdminTextField
        label="Slug"
        hint="The end of the module's web address, e.g. /course/volunteers-onboarding/about-kc. Changing it breaks old links to the module."
        value={values.slug}
        onChange={(e) => {
          setSlugEdited(true);
          set("slug", e.target.value);
        }}
        error={errors.slug}
        required
      />
      <AdminTextareaField
        label="Summary"
        hint="One line, shown on the module's card and under its title."
        rows={2}
        value={values.summary}
        onChange={(e) => set("summary", e.target.value)}
        error={errors.summary}
      />
      <AdminTextareaField
        label="Narrator intro"
        hint="Optional. What the guide says when the module opens."
        rows={3}
        value={values.narratorIntro}
        onChange={(e) => set("narratorIntro", e.target.value)}
        error={errors.narratorIntro}
      />
      <AdminCheckboxField
        label="Require the knowledge check to complete this module"
        checked={values.requiresCheck}
        onChange={(e) => set("requiresCheck", e.target.checked)}
        error={errors.requiresCheck}
      />
      {errors._form && (
        <p role="alert" className="text-small text-danger">
          {errors._form}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          {moduleId ? "Save module" : "Create module"}
        </Button>
        <Button
          href={
            moduleId && initial
              ? `/admin/content/${courseSlug}/${initial.slug}`
              : `/admin/content/${courseSlug}`
          }
          variant="ghost"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

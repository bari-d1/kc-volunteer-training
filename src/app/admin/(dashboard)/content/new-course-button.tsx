"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/form-fields";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { slugify } from "@/lib/slugify";
import { createCourseAction } from "./actions";

/** "New course": creates an unpublished course and opens it. */
export function NewCourseButton() {
  const router = useRouter();
  const save = useSaveToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await save(
        () => createCourseAction({ title, slug, description }),
        { success: "Course created" },
      );
      if (result.ok && "data" in result) {
        setOpen(false);
        router.push(`/admin/content/${result.data}`);
      } else if (!result.ok) {
        setErrors("fieldErrors" in result ? (result.fieldErrors ?? {}) : {});
      }
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button size="sm">New course</Button>}
      title="New course"
      description="It starts unpublished, so volunteers won't see it until you publish it."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AdminTextField
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          error={errors.title}
        />
        <AdminTextField
          label="Slug"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value);
          }}
          error={errors.slug}
        />
        <AdminTextareaField
          label="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={pending}>
            Create course
          </Button>
        </div>
      </form>
    </Modal>
  );
}

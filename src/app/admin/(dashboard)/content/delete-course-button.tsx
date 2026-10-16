"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import { deleteCourseAction } from "./actions";

/** Deletes the course after asking, then goes back to the course list. */
export function DeleteCourseButton({
  id,
  title,
  moduleCount,
}: {
  id: string;
  title: string;
  moduleCount: number;
}) {
  const router = useRouter();
  const save = useSaveToast();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger" size="sm">
          Delete course
        </Button>
      }
      title={`Delete “${title}”?`}
      description={`This permanently deletes the course, its ${moduleCount} module${moduleCount === 1 ? "" : "s"} and their content, its quiz questions, and volunteers' progress in it. It can't be undone.`}
      confirmLabel="Delete course"
      onConfirm={async () => {
        const result = await save(() => deleteCourseAction(id), {
          success: `“${title}” was deleted`,
        });
        if (result.ok) router.push("/admin/content");
        return result.ok;
      }}
    />
  );
}

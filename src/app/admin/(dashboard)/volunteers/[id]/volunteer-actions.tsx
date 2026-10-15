"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import {
  deleteVolunteerAction,
  resetModuleProgressAction,
  resetQuizAttemptsAction,
} from "./actions";

/** The three admin actions on a volunteer, each confirmed first. */
export function VolunteerActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const save = useSaveToast();

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={
          <Button variant="secondary" size="sm">
            Reset quiz attempts
          </Button>
        }
        title={`Reset ${name}'s quiz attempts?`}
        description="Deletes any quiz attempt they started but didn't submit, so their next attempt starts fresh. Submitted attempts are kept."
        confirmLabel="Reset attempts"
        destructive={false}
        onConfirm={async () => {
          const result = await save(() => resetQuizAttemptsAction(id), {
            success: "Quiz attempts reset",
          });
          if (result.ok) router.refresh();
          return result.ok;
        }}
      />
      <ConfirmDialog
        trigger={
          <Button variant="secondary" size="sm">
            Reset module progress
          </Button>
        }
        title={`Reset ${name}'s module progress?`}
        description="They'll start the training again from the first module. Their quiz history and certificate are kept."
        confirmLabel="Reset progress"
        onConfirm={async () => {
          const result = await save(() => resetModuleProgressAction(id), {
            success: "Module progress reset",
          });
          if (result.ok) router.refresh();
          return result.ok;
        }}
      />
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm">
            Delete volunteer
          </Button>
        }
        title={`Delete ${name}?`}
        description="This permanently deletes their profile, training progress, reflection answers, quiz results, certificate and email history, and removes their sign-in. It can't be undone."
        confirmLabel="Delete volunteer"
        onConfirm={async () => {
          const result = await save(() => deleteVolunteerAction(id), {
            success: `${name} was deleted`,
          });
          if (result.ok) router.push("/admin/volunteers");
          return result.ok;
        }}
      />
    </div>
  );
}

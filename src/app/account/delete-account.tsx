"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/modal";
import { deleteMyAccount } from "./actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" loading={pending}>
      {pending ? "Deleting…" : "Yes, delete my account"}
    </Button>
  );
}

export function DeleteAccount() {
  return (
    <Modal
      trigger={<Button variant="danger">Delete my account</Button>}
      title="Delete your account?"
      description="This permanently deletes your profile, training progress, reflection answers, quiz results and certificates, and removes your sign-in. It can't be undone."
      footer={
        <>
          <ModalClose asChild>
            <Button variant="ghost">Keep my account</Button>
          </ModalClose>
          <form action={deleteMyAccount}>
            <ConfirmButton />
          </form>
        </>
      }
    >
      <p className="text-body text-muted">
        Want a copy first? Close this and use “Download my data”.
      </p>
    </Modal>
  );
}

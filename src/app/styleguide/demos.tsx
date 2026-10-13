"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast";

export function LoadingButtonDemo() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <Button loading={loading} onClick={() => setLoading(true)}>
      {loading ? "Saving" : "Click to load"}
    </Button>
  );
}

export function ProgressDemo() {
  const [value, setValue] = useState(35);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-8">
        <ProgressRing value={value} label="Demo ring progress" />
        <ProgressRing
          value={value}
          label="Small demo ring progress"
          size={56}
          strokeWidth={5}
        />
      </div>
      <ProgressBar
        value={value}
        label="Demo bar progress"
        className="max-w-md"
      />
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setValue((v) => Math.max(v - 15, 0))}
        >
          −15
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setValue((v) => Math.min(v + 15, 100))}
        >
          +15
        </Button>
      </div>
    </div>
  );
}

export function ModalDemo() {
  return (
    <Modal
      trigger={<Button variant="secondary">Open modal</Button>}
      title="Leave this module?"
      description="Your progress is saved. You can pick up where you left off."
      footer={
        <>
          <ModalClose asChild>
            <Button variant="ghost">Stay</Button>
          </ModalClose>
          <ModalClose asChild>
            <Button>Leave</Button>
          </ModalClose>
        </>
      }
    />
  );
}

export function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            variant: "success",
            title: "Module complete",
            description: "Nice work. On to the next one.",
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            variant: "error",
            title: "Couldn't save progress",
            description: "Check your connection and try again.",
          })
        }
      >
        Error toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: "New module available" })}
      >
        Info toast
      </Button>
    </div>
  );
}

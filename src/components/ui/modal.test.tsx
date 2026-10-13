import { render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/modal";

function renderModal() {
  return render(
    <Modal
      trigger={<Button>Open</Button>}
      title="Leave module?"
      description="Your progress is saved."
      footer={
        <ModalClose asChild>
          <Button>Leave</Button>
        </ModalClose>
      }
    />,
  );
}

describe("Modal", () => {
  it("opens an accessible dialog from its trigger", async () => {
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Leave module?" });
    expect(dialog).toHaveAccessibleDescription("Your progress is saved.");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    renderModal();
    const trigger = screen.getByRole("button", { name: "Open" });

    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps focus inside the dialog", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");

    for (let i = 0; i < 4; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes from the close button", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Modal without a trigger", () => {
  it("returns focus to the element that opened it", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>External opener</Button>
          <Modal open={open} onOpenChange={setOpen} title="Controlled" />
        </>
      );
    }
    render(<Controlled />);
    const opener = screen.getByRole("button", { name: "External opener" });

    await userEvent.click(opener);
    expect(
      screen.getByRole("dialog", { name: "Controlled" }),
    ).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

function dialog(onConfirm: () => Promise<boolean | void>) {
  render(
    <ConfirmDialog
      trigger={<Button variant="danger">Delete module</Button>}
      title="Delete this module?"
      description="Its blocks are deleted too. This can't be undone."
      onConfirm={onConfirm}
    />,
  );
  return userEvent.click(screen.getByRole("button", { name: "Delete module" }));
}

describe("ConfirmDialog", () => {
  it("asks first, then runs the action and closes", async () => {
    const onConfirm = vi.fn(async () => {});
    await dialog(onConfirm);
    expect(
      screen.getByRole("dialog", { name: "Delete this module?" }),
    ).toHaveAccessibleDescription(/can't be undone/);
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels without running it", async () => {
    const onConfirm = vi.fn(async () => {});
    await dialog(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open when the action reports a failure", async () => {
    await dialog(async () => false);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});

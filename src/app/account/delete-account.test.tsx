import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const deleteMyAccount = vi.fn(async () => {});
vi.mock("./actions", () => ({ deleteMyAccount }));

const { DeleteAccount } = await import("./delete-account");

describe("DeleteAccount", () => {
  it("asks for confirmation and can be cancelled", async () => {
    render(<DeleteAccount />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete my account" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Delete your account?" });
    expect(dialog).toHaveAccessibleDescription(
      /permanently deletes your profile/,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Keep my account" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("deletes only after confirming", async () => {
    render(<DeleteAccount />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete my account" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Yes, delete my account" }),
    );
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledOnce());
  });
});

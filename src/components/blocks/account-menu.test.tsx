import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth-actions", () => ({ signOut }));

const { AccountMenu } = await import("./account-menu");

const toggle = () => screen.getByRole("button", { name: "Account" });

describe("AccountMenu", () => {
  it("opens to the account page and Sign out", async () => {
    render(<AccountMenu />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Your account" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("closes on Escape, returning focus, and on an outside click", async () => {
    render(
      <>
        <p>Outside</p>
        <AccountMenu />
      </>,
    );
    await userEvent.click(toggle());
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Your account" })).toBeNull();
    expect(toggle()).toHaveFocus();

    await userEvent.click(toggle());
    await userEvent.click(screen.getByText("Outside"));
    expect(screen.queryByRole("link", { name: "Your account" })).toBeNull();
  });
});

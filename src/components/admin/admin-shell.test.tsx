import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/admin/volunteers/123" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("@/app/admin/actions", () => ({ adminLogout: vi.fn() }));

const { AdminShell } = await import("./admin-shell");
const { isActiveAdminLink } = await import("./admin-nav-items");

describe("AdminShell", () => {
  it("lists every section, marks the current one and has Log out", () => {
    render(<AdminShell>Page body</AdminShell>);
    const sidebar = screen.getAllByRole("navigation", { name: "Admin" })[0];
    expect(
      within(sidebar)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual([
      "Overview",
      "Volunteers",
      "Content",
      "Quiz",
      "People & Teams",
      "Settings",
    ]);
    expect(
      within(sidebar).getByRole("link", { name: "Volunteers" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Overview" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(sidebar).getByRole("button", { name: "Log out" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByText("Page body")).toBeVisible();
  });

  it("shows the Admin pill", () => {
    render(<AdminShell>x</AdminShell>);
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  it("opens the nav in a drawer on phones", async () => {
    render(<AdminShell>x</AdminShell>);
    await userEvent.click(
      screen.getByRole("button", { name: "Open admin menu" }),
    );
    const drawer = screen.getByRole("dialog", { name: "Admin menu" });
    expect(within(drawer).getByRole("link", { name: "Quiz" })).toBeVisible();
    await userEvent.click(within(drawer).getByRole("link", { name: "Quiz" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("isActiveAdminLink", () => {
  it("matches Overview exactly and sections by prefix", () => {
    expect(isActiveAdminLink("/admin", "/admin")).toBe(true);
    expect(isActiveAdminLink("/admin", "/admin/quiz")).toBe(false);
    expect(isActiveAdminLink("/admin/quiz", "/admin/quiz/q1")).toBe(true);
    expect(isActiveAdminLink("/admin/quiz", "/admin/quizzes")).toBe(false);
  });
});

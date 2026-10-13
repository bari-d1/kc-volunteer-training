import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseLayout } from "@/components/blocks/course-layout";
import { mockCourse } from "@/lib/mock-course";

beforeEach(() => {
  // jsdom has no matchMedia.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  localStorage.clear();
});

function renderLayout() {
  return render(
    <CourseLayout course={mockCourse} currentModuleId="what-we-believe">
      <p>Lesson body</p>
    </CourseLayout>,
  );
}

describe("CourseLayout", () => {
  it("opens the mobile drawer, closes on Escape and returns focus", async () => {
    renderLayout();
    const menu = screen.getByRole("button", { name: "Open modules menu" });

    await userEvent.click(menu);
    const drawer = screen.getByRole("dialog", { name: "Modules" });
    expect(within(drawer).getAllByRole("listitem")).toHaveLength(12);
    expect(
      within(drawer).getByRole("link", { name: /What We Believe/ }),
    ).toHaveAttribute("aria-current", "page");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(menu).toHaveFocus();
  });

  it("does not link locked modules", () => {
    renderLayout();
    const sidebar = screen.getByRole("complementary", {
      name: "Course modules",
    });
    expect(
      within(sidebar).queryByRole("link", { name: /Final Quiz/ }),
    ).toBeNull();
    expect(within(sidebar).getByText(/Final Quiz/)).toBeInTheDocument();
  });

  it("remembers the collapsed sidebar in localStorage", async () => {
    renderLayout();
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse module list" }),
    );

    expect(localStorage.getItem("kc:sidebar-collapsed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Expand module list" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});

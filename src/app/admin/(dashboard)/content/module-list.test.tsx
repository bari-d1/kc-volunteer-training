import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
const actions = vi.hoisted(() => ({
  reorderModulesAction: vi.fn<
    (
      courseId: string,
      ids: string[],
    ) => Promise<{ ok: true } | { ok: false; error: string }>
  >(async () => ({ ok: true })),
  setModulePublishedAction: vi.fn(async () => ({ ok: true })),
  deleteModuleAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./actions", () => actions);

const { ModuleList } = await import("./module-list");

const modules = ["Welcome", "About KC", "Our Values"].map((title, i) => ({
  id: `m${i}`,
  title,
  slug: title.toLowerCase().replace(/\W+/g, "-"),
  isPublished: i < 2,
  requiresCheck: i === 1,
  blockCount: 3,
  draftBlockCount: i === 2 ? 2 : 0,
  progressCount: i === 0 ? 5 : 0,
}));

// jsdom has no layout: stack each list item 50px below the previous one.
let restore: () => void;
beforeEach(() => {
  vi.clearAllMocks();
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const li = this.closest("li");
    const index = li ? [...li.parentElement!.children].indexOf(li) : 0;
    const top = index * 50;
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 600,
      height: 50,
      right: 600,
      bottom: top + 50,
      toJSON() {},
    } as DOMRect;
  };
  restore = () => {
    Element.prototype.getBoundingClientRect = original;
  };
});
afterEach(() => restore());

const titles = () =>
  within(screen.getByRole("list", { name: "Modules in order" }))
    .getAllByRole("link")
    .map((l) => l.textContent);

describe("ModuleList", () => {
  it("shows order, status, blocks, check and unpublished changes", () => {
    render(<ModuleList courseId="c1" modules={modules} />);
    expect(titles()).toEqual(["Welcome", "About KC", "Our Values"]);
    const rows = within(
      screen.getByRole("list", { name: "Modules in order" }),
    ).getAllByRole("listitem");
    expect(within(rows[0]).getByText("Published")).toBeVisible();
    expect(within(rows[1]).getByText("Check required")).toBeVisible();
    expect(within(rows[2]).getByText("Unpublished")).toBeVisible();
    expect(within(rows[2]).getByText("2 unpublished changes")).toBeVisible();
    // Started by volunteers: no delete, only unpublish.
    expect(within(rows[0]).getByText("In use")).toBeVisible();
    expect(
      within(rows[0]).queryByRole("button", { name: "Delete" }),
    ).toBeNull();
    expect(
      within(rows[1]).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
  });

  it("reorders with the keyboard and saves the new order", async () => {
    render(<ModuleList courseId="c1" modules={modules} />);
    const handle = screen.getByRole("button", { name: "Move Welcome" });
    handle.focus();
    await act(async () => {
      await userEvent.keyboard("[Space]");
    });
    await act(async () => {
      await userEvent.keyboard("[ArrowDown]");
    });
    await act(async () => {
      await userEvent.keyboard("[Space]");
    });
    expect(actions.reorderModulesAction).toHaveBeenCalledWith("c1", [
      "m1",
      "m0",
      "m2",
    ]);
    expect(titles()).toEqual(["About KC", "Welcome", "Our Values"]);
    expect(toast).toHaveBeenCalledWith({
      variant: "success",
      title: "Order saved",
    });
  });

  it("puts the order back if saving fails", async () => {
    actions.reorderModulesAction.mockResolvedValueOnce({
      ok: false,
      error: "Nope",
    });
    render(<ModuleList courseId="c1" modules={modules} />);
    screen.getByRole("button", { name: "Move Welcome" }).focus();
    for (const key of ["[Space]", "[ArrowDown]", "[Space]"]) {
      await act(async () => {
        await userEvent.keyboard(key);
      });
    }
    expect(titles()).toEqual(["Welcome", "About KC", "Our Values"]);
    expect(toast).toHaveBeenCalledWith({ variant: "error", title: "Nope" });
  });

  it("publishes and unpublishes", async () => {
    render(<ModuleList courseId="c1" modules={modules} />);
    const rows = within(
      screen.getByRole("list", { name: "Modules in order" }),
    ).getAllByRole("listitem");
    await userEvent.click(
      within(rows[2]).getByRole("button", { name: "Publish" }),
    );
    expect(actions.setModulePublishedAction).toHaveBeenCalledWith("m2", true);
    expect(refresh).toHaveBeenCalled();
  });
});

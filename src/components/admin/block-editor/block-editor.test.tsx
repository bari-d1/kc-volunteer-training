import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
const actions = vi.hoisted(() => ({
  saveBlockDraftAction: vi.fn<
    (id: string, content: unknown) => Promise<{ ok: boolean }>
  >(async () => ({ ok: true })),
  createBlockAction: vi.fn(async () => ({ ok: true, data: "new-block" })),
  deleteBlockAction: vi.fn(async () => ({ ok: true })),
  duplicateBlockAction: vi.fn(async () => ({ ok: true, data: "copy" })),
  reorderBlocksAction: vi.fn(async () => ({ ok: true })),
  publishModuleChangesAction: vi.fn(async () => ({ ok: true, data: 1 })),
  discardModuleChangesAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/admin/(dashboard)/content/block-actions", () => actions);

const { BlockEditor, AUTOSAVE_DELAY_MS } = await import("./block-editor");

const blocks = [
  {
    id: "h1",
    type: "HEADING" as const,
    content: { text: "Our Values", level: 1 },
    isNew: false,
    changed: false,
  },
  {
    id: "f1",
    type: "FLIP_CARDS" as const,
    content: { cards: [{ front: "Kingdom", back: "Seek first" }] },
    isNew: false,
    changed: false,
  },
];

function renderEditor(hasUnpublishedChanges = false) {
  return render(
    <BlockEditor
      moduleId="mod"
      previewHref="/admin/preview/kc/our-values"
      initialBlocks={blocks}
      hasUnpublishedChanges={hasUnpublishedChanges}
      deletedCount={0}
    />,
  );
}
const status = () =>
  screen.getByText(
    (_, el) =>
      el?.getAttribute("aria-live") === "polite" && el.tagName === "SPAN",
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("BlockEditor", () => {
  it("lists blocks with their type and a summary, and edits the first", () => {
    renderEditor();
    const list = screen.getByRole("list", { name: "Blocks in order" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Our Values")).toBeVisible();
    expect(within(list).getByText("1 card: Kingdom")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Heading" })).toHaveValue(
      "Our Values",
    );
  });

  it("autosaves a valid change a second after typing stops", async () => {
    renderEditor();
    fireEvent.change(screen.getByRole("textbox", { name: "Heading" }), {
      target: { value: "Our Values!" },
    });
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 10));
    expect(actions.saveBlockDraftAction).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(actions.saveBlockDraftAction).toHaveBeenCalledWith("h1", {
      text: "Our Values!",
      level: 1,
    });
    expect(status()).toHaveTextContent("Saved");
    // The list summary follows the edit, and the banner appears.
    expect(screen.getByText("Our Values!")).toBeVisible();
    expect(
      screen.getByText("This module has unpublished changes."),
    ).toBeVisible();
  });

  it("shows errors next to the field and never saves invalid content", async () => {
    renderEditor();
    const heading = screen.getByRole("textbox", { name: "Heading" });
    fireEvent.change(heading, { target: { value: "" } });
    expect(heading).toHaveAttribute("aria-invalid", "true");
    expect(heading).toHaveAccessibleDescription(/./);
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 3));
    expect(actions.saveBlockDraftAction).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent("Fix the highlighted fields to save");
  });

  it("saves straight away when switching to another block", async () => {
    renderEditor();
    fireEvent.change(screen.getByRole("textbox", { name: "Heading" }), {
      target: { value: "Values" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /1 card: Kingdom/ }));
    });
    expect(actions.saveBlockDraftAction).toHaveBeenCalledWith("h1", {
      text: "Values",
      level: 1,
    });
    expect(screen.getByRole("textbox", { name: "Front" })).toHaveValue(
      "Kingdom",
    );
  });

  it("lists all 16 block types to add", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "+ Add block" }));
    const dialog = screen.getByRole("dialog", { name: "Add a block" });
    expect(
      within(dialog).getAllByRole("button", { name: /^\w/ }).length,
    ).toBeGreaterThanOrEqual(16);
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /Knowledge check/ }),
      );
    });
    expect(actions.createBlockAction).toHaveBeenCalledWith(
      "mod",
      "KNOWLEDGE_CHECK",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("publishes after confirming", async () => {
    renderEditor(true);
    expect(
      screen.getByText("This module has unpublished changes."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Publish",
        }),
      );
    });
    expect(actions.publishModuleChangesAction).toHaveBeenCalledWith("mod");
  });

  it("links to the preview in a new tab", () => {
    renderEditor();
    const preview = screen.getByRole("link", { name: /Preview/ });
    expect(preview).toHaveAttribute("href", "/admin/preview/kc/our-values");
    expect(preview).toHaveAttribute("target", "_blank");
  });
});

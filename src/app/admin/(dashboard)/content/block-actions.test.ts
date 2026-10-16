// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn(async () => {}) }));
const saveBlockDraft = vi.hoisted(() => vi.fn());
vi.mock("@/server/admin/blocks", () => ({
  saveBlockDraft,
  createBlock: vi.fn(),
  deleteBlock: vi.fn(),
  discardModuleChanges: vi.fn(),
  duplicateBlock: vi.fn(),
  publishModuleChanges: vi.fn(),
  reorderBlocks: vi.fn(),
}));

const { saveBlockDraftAction } = await import("./block-actions");
const { BlockEditError } = await import("@/server/admin/inputs");
const ID = "11111111-1111-4111-8111-111111111111";

describe("saveBlockDraftAction", () => {
  it("returns the schema's field errors when content is invalid", async () => {
    saveBlockDraft.mockRejectedValueOnce(
      new BlockEditError("Some fields need fixing.", { text: "Too small" }),
    );
    expect(await saveBlockDraftAction(ID, { text: "" })).toEqual({
      ok: false,
      error: "Some fields need fixing.",
      fieldErrors: { text: "Too small" },
    });
  });

  it("rejects a malformed id without saving", async () => {
    expect(await saveBlockDraftAction("nope", {})).toMatchObject({ ok: false });
    expect(saveBlockDraft).not.toHaveBeenCalled();
  });
});

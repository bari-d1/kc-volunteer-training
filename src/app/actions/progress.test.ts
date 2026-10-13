import { beforeEach, describe, expect, it, vi } from "vitest";

class Redirect extends Error {}
const requireVolunteer = vi.fn(async () => ({ id: "v1" }));
vi.mock("@/lib/auth", () => ({ requireVolunteer: () => requireVolunteer() }));

const saveProgress = vi.fn(async () => {});
const completeModule = vi.fn(async () => ({ completedAt: new Date() }));
vi.mock("@/server/progress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/progress")>()),
  saveProgress: (...a: unknown[]) => saveProgress(...(a as [])),
  completeModule: (...a: unknown[]) => completeModule(...(a as [])),
}));

const { saveProgressAction, completeModuleAction } = await import("./progress");
const { ProgressError } = await import("@/server/progress");
const MODULE_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  requireVolunteer.mockResolvedValue({ id: "v1" });
});

describe("saveProgressAction", () => {
  it("saves for the signed-in volunteer", async () => {
    expect(
      await saveProgressAction({ moduleId: MODULE_ID, lastBlockOrder: 3 }),
    ).toEqual({ ok: true });
    expect(saveProgress).toHaveBeenCalledWith("v1", MODULE_ID, 3);
  });

  it("rejects bad input and reports locked modules", async () => {
    expect(
      await saveProgressAction({ moduleId: "x", lastBlockOrder: -1 }),
    ).toEqual({ ok: false, error: "invalid" });
    saveProgress.mockRejectedValueOnce(new ProgressError("locked", "locked"));
    expect(
      await saveProgressAction({ moduleId: MODULE_ID, lastBlockOrder: 1 }),
    ).toEqual({ ok: false, error: "locked" });
  });

  it("requires a signed-in volunteer", async () => {
    requireVolunteer.mockRejectedValueOnce(new Redirect());
    await expect(
      saveProgressAction({ moduleId: MODULE_ID, lastBlockOrder: 1 }),
    ).rejects.toBeInstanceOf(Redirect);
    expect(saveProgress).not.toHaveBeenCalled();
  });
});

describe("completeModuleAction", () => {
  it("completes for the signed-in volunteer", async () => {
    expect(await completeModuleAction({ moduleId: MODULE_ID })).toEqual({
      ok: true,
    });
    expect(completeModule).toHaveBeenCalledWith("v1", MODULE_ID);
  });

  it("reports when the check is still required", async () => {
    completeModule.mockRejectedValueOnce(
      new ProgressError("check-required", "x"),
    );
    expect(await completeModuleAction({ moduleId: MODULE_ID })).toEqual({
      ok: false,
      error: "check-required",
    });
  });
});

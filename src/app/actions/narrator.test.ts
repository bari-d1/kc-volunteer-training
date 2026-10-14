import { beforeEach, describe, expect, it, vi } from "vitest";

class Redirect extends Error {}
const requireVolunteer = vi.fn(async () => ({ id: "v1" }));
vi.mock("@/lib/auth", () => ({ requireVolunteer: () => requireVolunteer() }));
const setNarratorHidden = vi.fn<(id: string, hidden: boolean) => Promise<void>>(
  async () => {},
);
vi.mock("@/server/account", () => ({
  setNarratorHidden: (id: string, hidden: boolean) =>
    setNarratorHidden(id, hidden),
}));

const { setGuideHidden } = await import("./narrator");

beforeEach(() => {
  vi.clearAllMocks();
  requireVolunteer.mockResolvedValue({ id: "v1" });
});

describe("setGuideHidden", () => {
  it("saves for the signed-in volunteer", async () => {
    expect(await setGuideHidden(true)).toEqual({ ok: true });
    expect(setNarratorHidden).toHaveBeenCalledWith("v1", true);
  });

  it("rejects anything that isn't a boolean", async () => {
    expect(await setGuideHidden("yes" as unknown as boolean)).toEqual({
      ok: false,
    });
    expect(setNarratorHidden).not.toHaveBeenCalled();
  });

  it("reports failures without throwing", async () => {
    setNarratorHidden.mockRejectedValueOnce(new Error("db"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await setGuideHidden(false)).toEqual({ ok: false });
  });

  it("requires a signed-in volunteer", async () => {
    requireVolunteer.mockRejectedValueOnce(new Redirect());
    await expect(setGuideHidden(true)).rejects.toBeInstanceOf(Redirect);
    expect(setNarratorHidden).not.toHaveBeenCalled();
  });
});

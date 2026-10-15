// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const updateMany = vi.hoisted(() => vi.fn(async () => ({ count: 1 })));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { updateMany } } }));

const { unsubscribeWithToken } = await import("./email-preferences");
const { createUnsubscribeToken } = await import("@/lib/unsubscribe-token");
const { POST } = await import("@/app/api/email/unsubscribe/route");

const PROFILE = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "u".repeat(40));
});
afterEach(() => vi.unstubAllEnvs());

describe("unsubscribing", () => {
  it("turns reminders off for the volunteer in the token", async () => {
    expect(
      await unsubscribeWithToken(await createUnsubscribeToken(PROFILE)),
    ).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: { emailReminders: false },
    });
  });

  it("does nothing with a bad token", async () => {
    expect(await unsubscribeWithToken("bogus")).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("works in one click from the List-Unsubscribe header", async () => {
    const token = await createUnsubscribeToken(PROFILE);
    const ok = await POST(
      new Request(
        `http://localhost/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: "POST", body: "List-Unsubscribe=One-Click" },
      ),
    );
    expect(ok.status).toBe(200);
    const bad = await POST(
      new Request("http://localhost/api/email/unsubscribe?token=bogus", {
        method: "POST",
      }),
    );
    expect(bad.status).toBe(400);
  });
});

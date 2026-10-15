// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendReminders = vi.hoisted(() =>
  vi.fn(async () => ({ sent: 2, skipped: 1, volunteers: [] })),
);
vi.mock("@/server/jobs/send-reminders", () => ({ sendReminders }));

const { GET } = await import("./route");

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/reminders", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "c".repeat(40));
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/reminders", () => {
  it("runs the job with the right secret", async () => {
    const response = await call(`Bearer ${"c".repeat(40)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 2, skipped: 1 });
  });

  it("refuses a missing or wrong secret", async () => {
    for (const header of [undefined, "Bearer nope", "c".repeat(40)]) {
      expect((await call(header)).status).toBe(401);
    }
    expect(sendReminders).not.toHaveBeenCalled();
  });

  it("refuses everything when CRON_SECRET isn't set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect(sendReminders).not.toHaveBeenCalled();
  });
});

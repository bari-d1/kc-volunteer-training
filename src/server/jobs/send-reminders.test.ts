// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sendEmail = vi.hoisted(() =>
  vi.fn<(input: Record<string, unknown>) => Promise<{ status: string }>>(
    async () => ({ status: "SENT" }),
  ),
);
vi.mock("../email", () => ({ sendEmail }));

const prisma = vi.hoisted(() => ({
  course: { findUnique: vi.fn() },
  profile: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
const emailsSetting = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../site-settings", () => ({
  getSetting: async () => emailsSetting.value,
}));

const { sendReminders } = await import("./send-reminders");
const { verifyUnsubscribeToken } = await import("@/lib/unsubscribe-token");

const NOW = new Date("2026-10-20T17:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const modules = [
  { id: "m1", slug: "welcome", title: "Welcome", order: 0 },
  { id: "m2", slug: "about-kc", title: "About KC", order: 1 },
  { id: "m3", slug: "our-values", title: "Our Values", order: 2 },
];

function profile(id: string, lastActivityDaysAgo: number, completed = 1) {
  return {
    id,
    email: `${id}@example.org`,
    firstName: id,
    createdAt: daysAgo(60),
    moduleProgress: modules.slice(0, completed).map((m) => ({
      moduleId: m.id,
      completedAt: daysAgo(lastActivityDaysAgo),
      updatedAt: daysAgo(lastActivityDaysAgo),
    })),
    emailLogs: [] as Array<{ createdAt: Date }>,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "s".repeat(40));
  vi.stubEnv("APP_URL", "https://kc.example");
  vi.spyOn(console, "info").mockImplementation(() => {});
  prisma.course.findUnique.mockResolvedValue({ id: "c1", modules });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendReminders", () => {
  it("does nothing when reminders are switched off in Settings", async () => {
    emailsSetting.value = { remindersEnabled: false, digestRecipients: [] };
    expect(await sendReminders({ now: NOW })).toEqual({
      sent: 0,
      skipped: 0,
      volunteers: [],
      disabled: true,
    });
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
    emailsSetting.value = null;
  });

  it("only looks at volunteers with reminders on who haven't finished", async () => {
    prisma.profile.findMany.mockResolvedValue([]);
    await sendReminders({ now: NOW });
    expect(prisma.profile.findMany.mock.calls[0][0].where).toEqual({
      emailReminders: true,
      certificates: { none: { courseId: "c1" } },
    });
  });

  it("emails volunteers who are due, linking to their next module", async () => {
    prisma.profile.findMany.mockResolvedValue([
      profile("quiet", 8),
      profile("busy", 2),
    ]);
    const run = await sendReminders({ now: NOW });
    expect(run).toMatchObject({ sent: 1, skipped: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const input = sendEmail.mock.calls[0][0] as {
      props: Record<string, string>;
      headers: Record<string, string>;
    };
    expect(input).toMatchObject({
      to: "quiet@example.org",
      template: "reminder",
      profileId: "quiet",
      props: {
        firstName: "quiet",
        completedModules: 1,
        totalModules: 3,
        nextModuleTitle: "About KC",
        continueUrl: "https://kc.example/course/volunteers-onboarding/about-kc",
      },
    });
    const token = new URL(input.props.unsubscribeUrl).searchParams.get("token");
    expect(await verifyUnsubscribeToken(token)).toBe("quiet");
    expect(input.headers["List-Unsubscribe"]).toMatch(
      /^<https:\/\/kc\.example\/api\/email\/unsubscribe\?token=.+>$/,
    );
    expect(input.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("uses the profile's start date when there's no progress", async () => {
    const fresh = { ...profile("new", 0, 0), createdAt: daysAgo(8) };
    prisma.profile.findMany.mockResolvedValue([fresh]);
    await sendReminders({ now: NOW });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          completedModules: 0,
          nextModuleTitle: "Welcome",
        }),
      }),
    );
  });

  it("sends at most the per-run limit", async () => {
    prisma.profile.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => profile(`v${i}`, 10)),
    );
    const run = await sendReminders({ now: NOW, limit: 3 });
    expect(run).toMatchObject({ sent: 3, skipped: 2 });
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it("counts failed sends as skipped", async () => {
    sendEmail.mockResolvedValueOnce({ status: "FAILED" });
    prisma.profile.findMany.mockResolvedValue([profile("quiet", 8)]);
    expect(await sendReminders({ now: NOW })).toMatchObject({
      sent: 0,
      skipped: 1,
    });
  });

  it("lists who's due on a dry run, sending nothing", async () => {
    prisma.profile.findMany.mockResolvedValue([
      profile("quiet", 8),
      profile("busy", 2),
    ]);
    const run = await sendReminders({ now: NOW, dryRun: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(
      run.volunteers.map((v) => [v.firstName, v.decision, v.outcome]),
    ).toEqual([
      ["quiet", { send: true, number: 1 }, "dry-run"],
      ["busy", { send: false, reason: "recently-active" }, undefined],
    ]);
  });
});

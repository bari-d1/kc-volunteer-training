// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const prisma = vi.hoisted(() => ({
  profile: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  certificate: { count: vi.fn(), findMany: vi.fn() },
  module: { findMany: vi.fn() },
  moduleProgress: { groupBy: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const stats = await import("./stats");

const NOW = new Date("2026-10-15T12:00:00Z"); // a Thursday
const WEEK_AGO = new Date("2026-10-08T12:00:00Z");

beforeEach(() => vi.clearAllMocks());

describe("getHeadlineStats", () => {
  it("compares each number with a week ago, all counted in the database", async () => {
    const at = (args: { where: Record<string, unknown> }) =>
      JSON.stringify(args.where).includes(WEEK_AGO.toISOString());
    // Signed up 10 now, 6 a week ago; started 7 / 4; completed 4 / 2.
    prisma.profile.count.mockImplementation(async (args) =>
      JSON.stringify(args.where).includes("moduleProgress")
        ? at(args)
          ? 4
          : 7
        : at(args)
          ? 6
          : 10,
    );
    prisma.certificate.count.mockImplementation(async (args) =>
      at(args) ? 2 : 4,
    );
    // Raw queries come in pairs per snapshot: first attempts, then attempts to pass.
    prisma.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const weekAgo = values.some(
          (v) => v instanceof Date && v.getTime() === WEEK_AGO.getTime(),
        );
        return strings.join("").includes("DISTINCT ON")
          ? [
              {
                takers: weekAgo ? BigInt(2) : BigInt(4),
                passed: weekAgo ? BigInt(1) : BigInt(3),
              },
            ]
          : [{ average: weekAgo ? 2 : 1.5 }];
      },
    );

    const result = await stats.getHeadlineStats("c1", NOW);
    expect(result).toEqual({
      signedUp: { value: 10, change: 4 },
      inProgress: { value: 3, change: 1 },
      completed: { value: 4, change: 2 },
      completionRate: { value: 40, change: 7 },
      firstAttemptPassRate: { value: 75, change: 25 },
      averageAttemptsToPass: { value: 1.5, change: -0.5 },
    });
    // No rows loaded: counts and aggregate SQL only.
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it("leaves rates empty when there's nothing to divide by", async () => {
    prisma.profile.count.mockResolvedValue(0);
    prisma.certificate.count.mockResolvedValue(0);
    prisma.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray) =>
        strings.join("").includes("DISTINCT ON")
          ? [{ takers: BigInt(0), passed: BigInt(0) }]
          : [{ average: null }],
    );
    const result = await stats.getHeadlineStats("c1", NOW);
    expect(result.completionRate).toEqual({ value: null, change: null });
    expect(result.firstAttemptPassRate.value).toBeNull();
    expect(result.averageAttemptsToPass.value).toBeNull();
  });
});

describe("getModuleFunnel", () => {
  it("lists sign-ups, then completions per module in course order", async () => {
    prisma.module.findMany.mockResolvedValue([
      { id: "m1", title: "Welcome" },
      { id: "m2", title: "About KC" },
      { id: "m3", title: "Our Values" },
    ]);
    prisma.moduleProgress.groupBy.mockResolvedValue([
      { moduleId: "m1", _count: { _all: 8 } },
      { moduleId: "m2", _count: { _all: 5 } },
    ]);
    prisma.profile.count.mockResolvedValue(10);
    expect(await stats.getModuleFunnel("c1")).toEqual([
      { label: "Signed up", count: 10 },
      { label: "1. Welcome", count: 8 },
      { label: "2. About KC", count: 5 },
      { label: "3. Our Values", count: 0 },
    ]);
  });
});

describe("getWeeklySignups", () => {
  it("fills 12 Monday-starting weeks, with zeros where nobody joined", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { week: new Date("2026-10-12T00:00:00Z"), count: BigInt(3) },
      { week: new Date("2026-09-28T00:00:00Z"), count: BigInt(1) },
    ]);
    const weeks = await stats.getWeeklySignups(12, NOW);
    expect(weeks).toHaveLength(12);
    expect(weeks[0].weekStart.toISOString()).toBe("2026-07-27T00:00:00.000Z");
    expect(weeks.at(-1)).toEqual({
      weekStart: new Date("2026-10-12T00:00:00Z"),
      count: 3,
    });
    expect(weeks.at(-3)?.count).toBe(1);
    expect(weeks.reduce((n, w) => n + w.count, 0)).toBe(4);
  });
});

describe("getBranchBreakdown", () => {
  it("lists every branch in order, with Not sure yet last", async () => {
    prisma.profile.groupBy.mockResolvedValue([
      { branchInterest: "CREATIVE", _count: { _all: 4 } },
      { branchInterest: null, _count: { _all: 2 } },
    ]);
    expect(await stats.getBranchBreakdown()).toEqual([
      { code: "EXPERIENCE", label: "Experience", count: 0 },
      { code: "MINISTRY", label: "Ministry", count: 0 },
      { code: "CREATIVE", label: "Creative", count: 4 },
      { code: "SYSTEMS", label: "Systems", count: 0 },
      { code: null, label: "Not sure yet", count: 2 },
    ]);
  });
});

describe("getRecentActivity", () => {
  it("merges sign-ups and completions, newest first, up to the limit", async () => {
    prisma.profile.findMany.mockResolvedValue([
      { firstName: "Ada", lastName: "O", createdAt: new Date("2026-10-15") },
      { firstName: "Bola", lastName: "K", createdAt: new Date("2026-10-10") },
    ]);
    prisma.certificate.findMany.mockResolvedValue([
      {
        issuedAt: new Date("2026-10-12"),
        profile: { firstName: "Chidi", lastName: "E" },
      },
    ]);
    expect(
      (await stats.getRecentActivity("c1", 2)).map((a) => [a.kind, a.name]),
    ).toEqual([
      ["signed-up", "Ada O"],
      ["completed", "Chidi E"],
    ]);
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });
});

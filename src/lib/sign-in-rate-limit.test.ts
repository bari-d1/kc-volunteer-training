import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// In-memory stand-in for the SignInAttempt table.
const rows: Array<{ emailHash: string; createdAt: Date }> = [];
vi.mock("@/lib/prisma", () => ({
  prisma: {
    signInAttempt: {
      findMany: async ({
        where,
      }: {
        where: { emailHash: string; createdAt: { gt: Date } };
      }) =>
        rows
          .filter(
            (r) =>
              r.emailHash === where.emailHash &&
              r.createdAt > where.createdAt.gt,
          )
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((r) => ({ createdAt: r.createdAt })),
      create: ({ data }: { data: { emailHash: string } }) => ({
        op: "create",
        data,
      }),
      deleteMany: ({ where }: { where: { createdAt: { lt: Date } } }) => ({
        op: "delete",
        where,
      }),
    },
    // Apply the queued operations at the mocked "current" time.
    $transaction: async (
      ops: Array<{
        op: string;
        data?: { emailHash: string };
        where?: { createdAt: { lt: Date } };
      }>,
    ) => {
      for (const op of ops) {
        if (op.op === "create")
          rows.push({ emailHash: op.data!.emailHash, createdAt: clock });
        if (op.op === "delete") {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].createdAt < op.where!.createdAt.lt) rows.splice(i, 1);
          }
        }
      }
    },
  },
}));

let clock = new Date("2026-10-13T12:00:00Z");
const { checkSignInRateLimit, hashEmail } =
  await import("@/lib/sign-in-rate-limit");

const minutes = (n: number) =>
  new Date(new Date("2026-10-13T12:00:00Z").getTime() + n * 60_000);

async function attempt(email: string, at: Date) {
  clock = at;
  return checkSignInRateLimit(email, at);
}

beforeEach(() => {
  rows.length = 0;
});

describe("hashEmail", () => {
  it("normalises case and whitespace and never stores the address", () => {
    expect(hashEmail("  Ada@Example.com ")).toBe(hashEmail("ada@example.com"));
    expect(hashEmail("ada@example.com")).not.toContain("ada");
    expect(hashEmail("ada@example.com")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("checkSignInRateLimit", () => {
  it("allows 3 requests per email in 10 minutes, then blocks", async () => {
    expect((await attempt("ada@example.com", minutes(0))).allowed).toBe(true);
    expect((await attempt("ada@example.com", minutes(1))).allowed).toBe(true);
    expect((await attempt("ada@example.com", minutes(2))).allowed).toBe(true);

    const blocked = await attempt("ada@example.com", minutes(3));
    expect(blocked).toEqual({ allowed: false, retryAfterMinutes: 7 });
  });

  it("counts each email separately", async () => {
    for (const m of [0, 1, 2]) await attempt("ada@example.com", minutes(m));
    expect((await attempt("sam@example.com", minutes(3))).allowed).toBe(true);
  });

  it("allows again once the oldest request leaves the window", async () => {
    for (const m of [0, 1, 2]) await attempt("ada@example.com", minutes(m));
    expect((await attempt("ada@example.com", minutes(9))).allowed).toBe(false);
    expect((await attempt("ada@example.com", minutes(10))).allowed).toBe(true);
  });

  it("doesn't record blocked requests", async () => {
    for (const m of [0, 1, 2, 3, 4, 5])
      await attempt("ada@example.com", minutes(m));
    expect(rows).toHaveLength(3);
  });

  it("prunes rows older than a day", async () => {
    await attempt("ada@example.com", minutes(0));
    await attempt("sam@example.com", minutes(24 * 60 + 1));
    expect(rows.map((r) => r.emailHash)).toEqual([
      hashEmail("sam@example.com"),
    ]);
  });
});

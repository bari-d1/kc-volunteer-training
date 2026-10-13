// @vitest-environment node
import { hash } from "@node-rs/argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Row = { ipHash: string; succeeded: boolean; createdAt: Date };
const rows: Row[] = [];
type Where = { ipHash: string; succeeded: boolean; createdAt: { gt: Date } };
const matches = (r: Row, w: Where) =>
  r.ipHash === w.ipHash &&
  r.succeeded === w.succeeded &&
  r.createdAt > w.createdAt.gt;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminLoginAttempt: {
      findFirst: async ({ where }: { where: Where }) => {
        const found = rows.filter((r) => matches(r, where)).at(-1);
        return found ? { createdAt: found.createdAt } : null;
      },
      findMany: async ({ where }: { where: Where }) =>
        rows
          .filter((r) => matches(r, where))
          .map((r) => ({ createdAt: r.createdAt })),
    },
  },
}));

const { adminLockout, hashIp, verifyAdminPassword } =
  await import("@/lib/admin-auth");

const start = new Date("2026-10-13T12:00:00Z").getTime();
const at = (minutes: number) => new Date(start + minutes * 60_000);
const fail = (minutes: number, ip = "ip-1") =>
  rows.push({ ipHash: ip, succeeded: false, createdAt: at(minutes) });

beforeEach(() => {
  rows.length = 0;
  process.env.ADMIN_SESSION_SECRET = "s".repeat(40);
});

describe("adminLockout", () => {
  it("allows four failures and locks on the fifth for 15 minutes", async () => {
    [0, 1, 2, 3].forEach((m) => fail(m));
    expect(await adminLockout("ip-1", at(4))).toEqual({ locked: false });

    fail(4);
    expect(await adminLockout("ip-1", at(5))).toEqual({
      locked: true,
      retryAfterMinutes: 10,
    });
    expect((await adminLockout("ip-1", at(15))).locked).toBe(false);
  });

  it("tracks each IP separately", async () => {
    [0, 1, 2, 3, 4].forEach((m) => fail(m));
    expect((await adminLockout("ip-2", at(5))).locked).toBe(false);
  });

  it("ignores failures before the last successful login", async () => {
    [0, 1, 2, 3].forEach((m) => fail(m));
    rows.push({ ipHash: "ip-1", succeeded: true, createdAt: at(4) });
    fail(5);
    expect((await adminLockout("ip-1", at(6))).locked).toBe(false);
  });
});

describe("hashIp", () => {
  it("is keyed and never contains the raw IP", () => {
    const hashed = hashIp("203.0.113.7");
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toContain("203");
    process.env.ADMIN_SESSION_SECRET = "t".repeat(40);
    expect(hashIp("203.0.113.7")).not.toBe(hashed);
  });
});

describe("verifyAdminPassword", () => {
  it("accepts the base64url-encoded hash the script prints, and a raw hash", async () => {
    const raw = await hash("correct horse battery");
    process.env.ADMIN_PASSWORD_HASH = Buffer.from(raw).toString("base64url");
    expect(await verifyAdminPassword("correct horse battery")).toBe(true);
    expect(await verifyAdminPassword("wrong")).toBe(false);
    expect(await verifyAdminPassword("")).toBe(false);

    process.env.ADMIN_PASSWORD_HASH = raw;
    expect(await verifyAdminPassword("correct horse battery")).toBe(true);
  });

  it("fails closed when no hash is configured", async () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    expect(await verifyAdminPassword("anything")).toBe(false);
  });
});

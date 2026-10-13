import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { NotAdmin, prisma } = vi.hoisted(() => ({
  NotAdmin: class NotAdmin extends Error {},
  // Any Prisma access fails the test.
  prisma: new Proxy(
    {},
    {
      get: (_, key) => {
        throw new Error(`Prisma touched (${String(key)}) before requireAdmin`);
      },
    },
  ),
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => {
    throw new NotAdmin("redirect /admin/login");
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

const modules = import.meta.glob<Record<string, unknown>>(
  ["./*.ts", "!./*.test.ts", "!./change-log.ts", "!./inputs.ts"],
  { eager: true },
);

const adminFunctions = Object.entries(modules).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([, value]) => typeof value === "function")
    .map(
      ([name, fn]) =>
        [
          `${file} ${name}`,
          fn as (...args: unknown[]) => Promise<unknown>,
        ] as const,
    ),
);

describe("src/server/admin", () => {
  it("has admin functions to check", () => {
    expect(adminFunctions.length).toBeGreaterThan(15);
  });

  it.each(adminFunctions)(
    "%s calls requireAdmin before anything else",
    async (_, fn) => {
      await expect(
        fn("00000000-0000-4000-8000-000000000000", {}),
      ).rejects.toBeInstanceOf(NotAdmin);
    },
  );
});

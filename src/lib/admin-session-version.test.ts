// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookie.value ? { value: cookie.value } : undefined),
  }),
  headers: async () => new Headers(),
}));
const version = vi.hoisted(() => ({ value: 0 }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      findUnique: async () =>
        version.value ? { value: { version: version.value } } : null,
    },
  },
}));

const { isAdmin } = await import("./admin-auth");
const { createAdminToken } = await import("./admin-session");

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "s".repeat(40));
  version.value = 0;
});

describe("admin session version", () => {
  it("accepts a token from the current version", async () => {
    cookie.value = await createAdminToken(Date.now(), 0);
    expect(await isAdmin()).toBe(true);
  });

  it("rejects tokens from before 'Sign out all admin sessions'", async () => {
    cookie.value = await createAdminToken(Date.now(), 0);
    version.value = 1;
    expect(await isAdmin()).toBe(false);
    cookie.value = await createAdminToken(Date.now(), 1);
    expect(await isAdmin()).toBe(true);
  });
});

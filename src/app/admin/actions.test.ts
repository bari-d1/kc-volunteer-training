import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  isAdminConfigured: vi.fn(() => true),
  clientIp: vi.fn(async () => "203.0.113.7"),
  hashIp: vi.fn(() => "ip-hash"),
  adminLockout: vi.fn(
    async () =>
      ({ locked: false }) as { locked: boolean; retryAfterMinutes?: number },
  ),
  verifyAdminPassword: vi.fn(async () => true),
  recordAdminLoginAttempt: vi.fn(async () => {}),
  startAdminSession: vi.fn(async () => {}),
  endAdminSession: vi.fn(async () => {}),
  requireAdmin: vi.fn(async () => {}),
};
vi.mock("@/lib/admin-auth", () => auth);

class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const { adminLogin, adminLogout } = await import("./actions");

async function login(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  try {
    return { state: await adminLogin({}, data) };
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.to };
    throw error;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAdminConfigured.mockReturnValue(true);
  auth.adminLockout.mockResolvedValue({ locked: false });
  auth.verifyAdminPassword.mockResolvedValue(true);
});

describe("adminLogin", () => {
  it("starts a session, records success and returns to the admin page", async () => {
    expect(await login({ password: "pw", next: "/admin/courses" })).toEqual({
      redirect: "/admin/courses",
    });
    expect(auth.recordAdminLoginAttempt).toHaveBeenCalledWith("ip-hash", true);
    expect(auth.startAdminSession).toHaveBeenCalled();
  });

  it.each(["/course", "https://evil.example.com", "//evil.example.com"])(
    "only redirects within /admin (next=%s)",
    async (next) => {
      expect(await login({ password: "pw", next })).toEqual({
        redirect: "/admin",
      });
    },
  );

  it("records a failure and explains a wrong password", async () => {
    auth.verifyAdminPassword.mockResolvedValue(false);
    expect(await login({ password: "nope" })).toEqual({
      state: { error: "That password isn't right. Check it and try again." },
    });
    expect(auth.recordAdminLoginAttempt).toHaveBeenCalledWith("ip-hash", false);
    expect(auth.startAdminSession).not.toHaveBeenCalled();
  });

  it("doesn't check the password while locked out", async () => {
    auth.adminLockout.mockResolvedValue({
      locked: true,
      retryAfterMinutes: 12,
    });
    const result = await login({ password: "pw" });
    expect(result.state?.error).toMatch(/try again in 12 minutes/);
    expect(auth.verifyAdminPassword).not.toHaveBeenCalled();
    expect(auth.recordAdminLoginAttempt).not.toHaveBeenCalled();
  });

  it("explains when admin sign-in isn't configured", async () => {
    auth.isAdminConfigured.mockReturnValue(false);
    expect((await login({ password: "pw" })).state?.error).toMatch(
      /isn't set up/,
    );
  });
});

describe("adminLogout", () => {
  it("clears the session and returns to login", async () => {
    await expect(adminLogout()).rejects.toMatchObject({ to: "/admin/login" });
    expect(auth.requireAdmin).toHaveBeenCalled();
    expect(auth.endAdminSession).toHaveBeenCalled();
  });
});

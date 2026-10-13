// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/admin-session";

const updateSession = vi.fn(async () => new Response(null));
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: () => updateSession(),
}));

const { proxy } = await import("@/proxy");

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
  updateSession.mockClear();
});

async function request(path: string, token?: string) {
  const req = new NextRequest(new URL(path, "https://kc.test"));
  if (token) req.cookies.set(ADMIN_COOKIE, token);
  return proxy(req);
}

describe("proxy: admin", () => {
  it.each(["/admin", "/admin/courses?tab=1"])(
    "sends visitors without a session from %s to login",
    async (path) => {
      const response = await request(path);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/admin/login");
      expect(location.searchParams.get("next")).toBe(path);
    },
  );

  it("rejects an invalid cookie", async () => {
    const response = await request("/admin", "forged.token.here");
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/admin/login",
    );
  });

  it("lets a valid session through without touching Supabase", async () => {
    const response = await request("/admin/courses", await createAdminToken());
    expect(response.headers.get("location")).toBeNull();
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("shows the login page to signed-out admins and skips it when signed in", async () => {
    expect((await request("/admin/login")).headers.get("location")).toBeNull();
    const signedIn = await request("/admin/login", await createAdminToken());
    expect(new URL(signedIn.headers.get("location")!).pathname).toBe("/admin");
  });

  it("hands other paths to the volunteer session handler", async () => {
    await request("/course");
    await request("/administrator-info");
    expect(updateSession).toHaveBeenCalledTimes(2);
  });
});

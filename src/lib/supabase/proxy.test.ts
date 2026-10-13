// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = false;
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({
        data: signedIn ? { claims: { sub: "user-1" } } : null,
        error: null,
      }),
    },
  }),
}));

const { updateSession } = await import("@/lib/supabase/proxy");

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
});

function request(path: string) {
  return new NextRequest(new URL(path, "https://kc.test"));
}

describe("updateSession", () => {
  it.each(["/course", "/course/about-kc?step=2", "/onboarding"])(
    "sends signed-out visitors on %s to sign-in with next",
    async (path) => {
      signedIn = false;
      const response = await updateSession(request(path));
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("next")).toBe(path);
    },
  );

  it.each(["/", "/sign-in", "/styleguide", "/courses-info"])(
    "lets signed-out visitors through to %s",
    async (path) => {
      signedIn = false;
      const response = await updateSession(request(path));
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("lets signed-in volunteers into the course", async () => {
    signedIn = true;
    const response = await updateSession(request("/course/about-kc"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends signed-in volunteers away from sign-in", async () => {
    signedIn = true;
    const response = await updateSession(request("/sign-in"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/course");
  });
});

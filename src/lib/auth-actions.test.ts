import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

class Redirect extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp } }),
}));
const hasProfile = vi.fn<(id: string) => Promise<boolean>>(async () => true);
vi.mock("@/server/profiles", () => ({
  hasProfile: (id: string) => hasProfile(id),
}));
vi.mock("@/lib/sign-in-rate-limit", () => ({}));
vi.mock("@/lib/site-url", () => ({}));

const { signInWithCode } = await import("./auth-actions");

function submit(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return signInWithCode({ status: "idle" }, form);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("signInWithCode", () => {
  it("signs in with the emailed code and continues to the next page", async () => {
    await expect(
      submit({
        email: "Ada@Example.com",
        code: "123 456",
        next: "/course/about-kc",
      }),
    ).rejects.toMatchObject({ message: "/course/about-kc" });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "ada@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("sends new volunteers to onboarding", async () => {
    hasProfile.mockResolvedValueOnce(false);
    await expect(
      submit({ email: "ada@example.com", code: "123456", next: "/course" }),
    ).rejects.toMatchObject({ message: "/onboarding" });
  });

  it("never redirects off-site", async () => {
    await expect(
      submit({
        email: "ada@example.com",
        code: "123456",
        next: "https://evil.example",
      }),
    ).rejects.toMatchObject({ message: "/course" });
  });

  it("asks for the code without calling Supabase when it's malformed", async () => {
    expect(await submit({ email: "ada@example.com", code: "12" })).toEqual({
      status: "error",
      message: "Enter the 6-digit code from your email.",
    });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("explains a wrong or expired code", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 403, code: "otp_expired", message: "Token has expired" },
    });
    expect(
      await submit({ email: "ada@example.com", code: "123456" }),
    ).toMatchObject({
      status: "error",
      message: expect.stringMatching(/isn't right or has expired/),
    });
  });

  it("says to wait after too many tries", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 429, code: "over_request_rate_limit", message: "" },
    });
    expect(
      await submit({ email: "ada@example.com", code: "123456" }),
    ).toMatchObject({ message: expect.stringMatching(/Too many tries/) });
  });
});

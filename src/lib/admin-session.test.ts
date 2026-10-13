// @vitest-environment node
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_SECONDS,
  adminCookieOptions,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-session";

const SECRET = "a".repeat(40);

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
});

describe("admin session token", () => {
  it("verifies a fresh token", async () => {
    expect(await verifyAdminToken(await createAdminToken())).toBe(true);
  });

  it("expires after 12 hours", async () => {
    const issued = Date.now() - ADMIN_SESSION_SECONDS * 1000 - 1000;
    expect(await verifyAdminToken(await createAdminToken(issued))).toBe(false);
  });

  it("rejects tampered, missing and foreign tokens", async () => {
    const token = await createAdminToken();
    const [header, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ role: "admin", exp: 9999999999 }),
    ).toString("base64url");
    expect(await verifyAdminToken(`${header}.${forged}.${signature}`)).toBe(
      false,
    );
    expect(
      await verifyAdminToken(`${header}.${payload}.x${signature.slice(1)}`),
    ).toBe(false);
    expect(await verifyAdminToken(undefined)).toBe(false);
    expect(await verifyAdminToken("not-a-jwt")).toBe(false);

    process.env.ADMIN_SESSION_SECRET = "b".repeat(40);
    expect(await verifyAdminToken(token)).toBe(false);
  });

  it("rejects a validly signed token without the admin role", async () => {
    const token = await new SignJWT({ role: "volunteer" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyAdminToken(token)).toBe(false);
  });

  it("fails closed when the secret is missing or short", async () => {
    const token = await createAdminToken();
    process.env.ADMIN_SESSION_SECRET = "short";
    expect(await verifyAdminToken(token)).toBe(false);
    await expect(createAdminToken()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });

  it("uses httpOnly, lax, 12-hour cookies", () => {
    expect(adminCookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
  });
});

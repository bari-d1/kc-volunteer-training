/**
 * Signed admin session cookie (shared-password admin, temporary).
 * Kept free of Node-only imports so the proxy can verify sessions.
 * Password checks, rate limiting and requireAdmin live in admin-auth.ts.
 */
import { jwtVerify, SignJWT } from "jose";

export const ADMIN_COOKIE = "kc_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

function secretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a random string of at least 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** A signed token that expires in 12 hours. */
export async function createAdminToken(now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ADMIN_SESSION_SECONDS)
    .sign(secretKey());
}

/** True when the token is signed by us, unexpired and an admin token. */
export async function verifyAdminToken(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
} as const;

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

/**
 * A signed token that expires in 12 hours. `version` is the admin session
 * version from SiteSetting: bumping it there invalidates older tokens.
 */
export async function createAdminToken(now = Date.now(), version = 0) {
  const issuedAt = Math.floor(now / 1000);
  return new SignJWT({ role: "admin", v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ADMIN_SESSION_SECONDS)
    .sign(secretKey());
}

/**
 * The session version of a token signed by us, unexpired and for an admin,
 * or null. Tokens from before versions existed count as version 0.
 */
export async function readAdminToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin") return null;
    return { version: typeof payload.v === "number" ? payload.v : 0 };
  } catch {
    return null;
  }
}

/**
 * True when the token is signed by us, unexpired and an admin token. The
 * proxy uses this; requireAdmin() also checks the session version.
 */
export async function verifyAdminToken(token: string | undefined) {
  return (await readAdminToken(token)) !== null;
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
} as const;

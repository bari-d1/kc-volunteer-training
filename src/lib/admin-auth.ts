/**
 * Shared-password admin auth. TEMPORARY: replace with individual admin
 * accounts later. Everything about it lives here and in admin-session.ts.
 */
import "server-only";
import { createHmac } from "node:crypto";
import { verify } from "@node-rs/argon2";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-session";

export const ADMIN_MAX_FAILURES = 5;
export const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

// ─── Session ─────────────────────────────────────────────────────────────────

export async function isAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/**
 * Call at the top of every admin page, server action and route handler.
 * The proxy also guards /admin, but it isn't enough on its own: server
 * actions can be invoked directly.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await createAdminToken(), adminCookieOptions);
}

export async function endAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

// ─── Password ────────────────────────────────────────────────────────────────

/** ADMIN_PASSWORD_HASH holds a base64-encoded argon2id hash (see scripts/hash-admin-password.mts). */
function passwordHash() {
  const value = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!value) return null;
  // Accept a raw hash too, in case it was pasted unencoded.
  return value.startsWith("$argon2")
    ? value
    : Buffer.from(value, "base64url").toString("utf8");
}

export function isAdminConfigured() {
  return Boolean(passwordHash() && process.env.ADMIN_SESSION_SECRET);
}

export async function verifyAdminPassword(password: string) {
  const hash = passwordHash();
  if (!hash || !password) return false;
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

/** Client IP from the proxy headers set by the host (e.g. Vercel). */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** Keyed hash so the table never holds raw IP addresses. */
export function hashIp(ip: string) {
  const key = process.env.ADMIN_SESSION_SECRET ?? "kc-dev-only";
  return createHmac("sha256", key).update(ip).digest("hex");
}

/**
 * Whether this IP is locked out: 5 failed attempts within 15 minutes,
 * counting only failures since its last successful login.
 */
export async function adminLockout(ipHash: string, now = new Date()) {
  const windowStart = new Date(now.getTime() - ADMIN_LOCKOUT_MS);
  const lastSuccess = await prisma.adminLoginAttempt.findFirst({
    where: { ipHash, succeeded: true, createdAt: { gt: windowStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const since = lastSuccess?.createdAt ?? windowStart;

  const failures = await prisma.adminLoginAttempt.findMany({
    where: { ipHash, succeeded: false, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (failures.length < ADMIN_MAX_FAILURES) return { locked: false as const };

  // Unlocks when enough of the oldest failures fall out of the window.
  const unlockAt =
    failures[failures.length - ADMIN_MAX_FAILURES].createdAt.getTime() +
    ADMIN_LOCKOUT_MS;
  return {
    locked: true as const,
    retryAfterMinutes: Math.max(
      1,
      Math.ceil((unlockAt - now.getTime()) / 60_000),
    ),
  };
}

export async function recordAdminLoginAttempt(
  ipHash: string,
  succeeded: boolean,
) {
  await prisma.$transaction([
    prisma.adminLoginAttempt.create({ data: { ipHash, succeeded } }),
    prisma.adminLoginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    }),
  ]);
}

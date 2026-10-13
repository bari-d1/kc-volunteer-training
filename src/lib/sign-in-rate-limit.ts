import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SIGN_IN_LIMIT = 3;
export const SIGN_IN_WINDOW_MS = 10 * 60 * 1000;
// Rows older than this are no longer needed for any window.
const RETENTION_MS = 24 * 60 * 60 * 1000;

/** Keyed hash so the table never holds readable email addresses. */
export function hashEmail(email: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET ?? "kc-dev-only";
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
}

/**
 * Records a magic-link request and reports whether it's within the limit
 * (3 per email per 10 minutes). Blocked requests aren't recorded, so the
 * window always ends 10 minutes after the last link actually sent.
 */
export async function checkSignInRateLimit(email: string, now = new Date()) {
  const emailHash = hashEmail(email);
  const since = new Date(now.getTime() - SIGN_IN_WINDOW_MS);

  const recent = await prisma.signInAttempt.findMany({
    where: { emailHash, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (recent.length >= SIGN_IN_LIMIT) {
    const retryAt = recent[0].createdAt.getTime() + SIGN_IN_WINDOW_MS;
    return {
      allowed: false as const,
      retryAfterMinutes: Math.max(
        1,
        Math.ceil((retryAt - now.getTime()) / 60_000),
      ),
    };
  }

  await prisma.$transaction([
    prisma.signInAttempt.create({ data: { emailHash } }),
    prisma.signInAttempt.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
    }),
  ]);
  return { allowed: true as const };
}

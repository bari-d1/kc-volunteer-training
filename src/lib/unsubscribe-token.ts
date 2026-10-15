/**
 * Signed tokens for unsubscribe links in reminder emails, so a volunteer can
 * turn reminders off without signing in. They don't expire: an old email's
 * link should still work.
 */
import { jwtVerify, SignJWT } from "jose";

const PURPOSE = "email-unsubscribe";

function secretKey() {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET must be set to a random string of at least 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** A token naming the volunteer whose reminders it turns off. */
export async function createUnsubscribeToken(profileId: string) {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profileId)
    .setIssuedAt()
    .sign(secretKey());
}

/** The profile id from a valid unsubscribe token, or null. */
export async function verifyUnsubscribeToken(token: string | null | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.purpose === PURPOSE && typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

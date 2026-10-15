// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

const SECRET = "x".repeat(40);
const PROFILE = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", SECRET));
afterEach(() => vi.unstubAllEnvs());

describe("unsubscribe tokens", () => {
  it("round-trips the profile id", async () => {
    const token = await createUnsubscribeToken(PROFILE);
    expect(await verifyUnsubscribeToken(token)).toBe(PROFILE);
  });

  it("rejects missing, tampered and differently-signed tokens", async () => {
    const token = await createUnsubscribeToken(PROFILE);
    expect(await verifyUnsubscribeToken(undefined)).toBeNull();
    expect(await verifyUnsubscribeToken(`${token}x`)).toBeNull();
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "y".repeat(40));
    expect(await verifyUnsubscribeToken(token)).toBeNull();
  });

  it("rejects tokens signed for something else", async () => {
    const other = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(PROFILE)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyUnsubscribeToken(other)).toBeNull();
  });

  it("refuses to sign without a proper secret", async () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "short");
    await expect(createUnsubscribeToken(PROFILE)).rejects.toThrow(
      /EMAIL_UNSUBSCRIBE_SECRET/,
    );
  });
});

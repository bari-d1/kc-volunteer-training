/**
 * Digits in the sign-in code in each email (Supabase mailer_otp_length,
 * set by pnpm auth:configure). Typed on another device when the link is
 * opened somewhere else.
 */
export const SIGN_IN_CODE_LENGTH = 6;

/** "123 456" or "123-456" → "123456"; null unless it's exactly the right length. */
export function normaliseSignInCode(value: unknown) {
  const digits = String(value ?? "").replace(/[\s-]/g, "");
  return new RegExp(`^\\d{${SIGN_IN_CODE_LENGTH}}$`).test(digits)
    ? digits
    : null;
}

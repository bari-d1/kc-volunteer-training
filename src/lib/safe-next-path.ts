/**
 * Returns a same-site path to redirect to after sign-in, or the fallback.
 * Rejects absolute URLs and protocol-relative paths to prevent open redirects.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/course",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const base = "http://kc.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

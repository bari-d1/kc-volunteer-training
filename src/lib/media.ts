/** Public Supabase Storage URL prefix for this project, if configured. */
export function supabaseStoragePrefix() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url.replace(/\/$/, "")}/storage/v1/object/public/` : null;
}

/**
 * Whether next/image can optimise this URL: site paths and this project's
 * Supabase Storage (see images.remotePatterns in next.config.ts). Anything
 * else is shown unoptimised rather than erroring.
 */
export function isOptimizableImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  const prefix = supabaseStoragePrefix();
  return prefix !== null && src.startsWith(prefix);
}

/** The video id from a YouTube watch, short, embed or youtu.be URL, else null. */
export function youtubeId(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else {
      const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      id = match?.[1] ?? null;
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** True for absolute http(s) URLs on another site. */
export function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

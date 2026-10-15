/**
 * The app's public origin for absolute links in emails: APP_URL, else
 * SITE_URL, else local dev. No trailing slash.
 */
export function getAppUrl() {
  const url =
    process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** An absolute link to a path in the app, e.g. appUrl("/course"). */
export function appUrl(path: string) {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * pnpm auth:configure [--dry-run] [--skip-templates]
 *
 * Applies this project's Supabase Auth settings through the Management API:
 * fetches the current config, prints what will change, then PATCHes it.
 *
 * Env: SUPABASE_ACCESS_TOKEN (personal access token, never printed),
 * SUPABASE_PROJECT_REF (defaults to the ref in NEXT_PUBLIC_SUPABASE_URL),
 * SITE_URL (defaults to http://localhost:3000).
 */
import "dotenv/config";
import {
  desiredConfig,
  diffConfig,
  formatChange,
  LOCAL_URL,
  TEMPLATE_FIELDS,
  type AuthConfig,
} from "./supabase-auth-config";

const API = "https://api.supabase.com/v1";

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const match = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (match) return match[1];
  fail(
    "Set SUPABASE_PROJECT_REF (Supabase dashboard → Project Settings → General).",
  );
}

async function api(path: string, init: RequestInit = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    fail(
      "Set SUPABASE_ACCESS_TOKEN: create a personal access token at https://supabase.com/dashboard/account/tokens",
    );
  }
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    fail(
      `Couldn't reach the Supabase Management API: ${(error as Error).message}`,
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (body as { message?: string }).message ?? response.statusText;
    if (response.status === 401)
      fail(`Supabase rejected the access token (401). ${message}`);
    if (response.status === 404)
      fail(`Project not found (404). Check SUPABASE_PROJECT_REF. ${message}`);
    if (/template modification is not available/i.test(message)) {
      fail(
        `${message}\n  Email templates need custom SMTP on Supabase's free plan. Set up SMTP ` +
          `(Authentication → Emails → SMTP), or rerun with --skip-templates to apply the other settings.`,
      );
    }
    fail(`Supabase API error ${response.status}: ${message}`);
  }
  return body as AuthConfig;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const skipTemplates = args.has("--skip-templates");
  const ref = projectRef();
  const siteUrl = process.env.SITE_URL || LOCAL_URL;

  console.log(
    `Project ${ref}, site URL ${siteUrl}${dryRun ? " (dry run)" : ""}`,
  );
  const current = await api(`/projects/${ref}/config/auth`);
  const desired = desiredConfig(current, siteUrl, { skipTemplates });
  const changes = diffConfig(current, desired);

  if (skipTemplates) {
    console.log(`Skipping email templates (${TEMPLATE_FIELDS.length} fields).`);
  }
  if (changes.length === 0) {
    console.log("\nAlready up to date. Nothing to change.");
    return;
  }
  console.log(`\n${changes.length} change${changes.length === 1 ? "" : "s"}:`);
  for (const change of changes) console.log(`  ${formatChange(change)}`);

  if (dryRun) {
    console.log("\nDry run: nothing applied. Run without --dry-run to apply.");
    return;
  }

  const patch = Object.fromEntries(changes.map(({ field, to }) => [field, to]));
  await api(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  console.log("\n✓ Applied.");
}

main();

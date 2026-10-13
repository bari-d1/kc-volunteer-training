/**
 * Confirms the Supabase Data API can't read our tables with the anon key.
 * Every Prisma model table must be denied or return no rows.
 *
 * Usage: pnpm db:check-rls
 * Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file; rely on the environment.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.",
  );
  process.exit(1);
}

// Profile and Course first, then every other model in the schema.
const schema = readFileSync("prisma/schema.prisma", "utf8");
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
const tables = [
  "Profile",
  "Course",
  ...models.filter((m) => m !== "Profile" && m !== "Course"),
];

const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failed = false;

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(1)
    .abortSignal(AbortSignal.timeout(10_000));

  if (error && !error.code) {
    // Network failure: no point trying the other tables.
    console.error(`✗ Can't reach ${url}: ${error.message}`);
    process.exit(1);
  }

  if (error) {
    // 42501 = permission denied. Anything else (e.g. PGRST205 table not found,
    // usually a wrong project or unmigrated database) can't prove it's locked.
    const denied =
      error.code === "42501" || /permission denied/i.test(error.message);
    if (denied) {
      console.log(`✓ ${table}: denied (${error.code ?? "error"})`);
    } else {
      failed = true;
      console.error(
        `✗ ${table}: could not verify (${error.code}: ${error.message})`,
      );
    }
  } else if (data.length === 0) {
    console.log(`✓ ${table}: no rows returned`);
  } else {
    failed = true;
    console.error(`✗ ${table}: anon key can read rows!`);
  }
}

if (failed) {
  console.error("\nRLS check failed.");
  process.exit(1);
}
console.log(`\nAll ${tables.length} tables are closed to the anon key.`);

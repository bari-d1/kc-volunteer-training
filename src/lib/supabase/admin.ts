import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Supabase client with the secret (service role) key. Bypasses RLS and can
 * manage auth users, so it must only ever run on the server.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SECRET_KEY. See .env.example.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Supabase client for Client Components. Auth only; data goes through the server. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}

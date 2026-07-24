import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side reads that must bypass
 * Row Level Security — the admin panel's activity-log feed and the auth-user
 * listing (`auth.admin.listUsers()`).
 *
 * SECURITY: this uses the SUPABASE_SERVICE_ROLE_KEY, which grants full access.
 * The `server-only` import above makes the build fail if this module is ever
 * pulled into a Client Component, so the key can never reach the browser.
 *
 * Returns `null` when the key isn't configured (e.g. local dev without the
 * secret) so callers can degrade gracefully instead of crashing the page.
 */
export function createAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

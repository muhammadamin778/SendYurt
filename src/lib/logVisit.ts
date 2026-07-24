import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Records a page visit for the signed-in user in Supabase `activity_logs`.
 *
 * Browser-only: it reads the current Supabase session from the client and, if
 * the user is authenticated, inserts { user_id, email, path }. Anonymous
 * visitors are skipped (the table's RLS only allows authenticated inserts).
 *
 * The whole thing is wrapped in try/catch — visit logging is best-effort
 * telemetry and must never block navigation, surface an error, or crash the
 * user's screen.
 */
export async function logUserVisit(path: string): Promise<void> {
  try {
    const supabase = createBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      email: user.email ?? null,
      path,
    });
  } catch {
    // Swallow all errors — logging must never affect the user experience.
  }
}

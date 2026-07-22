import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads/writes the auth session via Next's cookie store. In a Server
 * Component the cookie store is read-only, so `setAll` is wrapped in a
 * try/catch — the session is refreshed in middleware, which CAN set cookies.
 */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — ignore; middleware handles refresh.
          }
        },
      },
    },
  );
}

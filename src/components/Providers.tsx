"use client";

/**
 * Client provider shell. Auth is Supabase (cookie-based, read on the server),
 * so there is no client-side session context to provide here — this stays a
 * passthrough so the layout's wrapper contract is unchanged.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAppSession } from "@/lib/supabase/app-session";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Server-side admin guard for layouts and pages (React Server Components).
 * The admin role is read fresh from the database (via the bridged session) on
 * every request — a stale session can outlive a demotion — and the check
 * redirects rather than throwing so it composes with `/admin/layout.tsx`.
 * Wrapped in `cache()` so the layout and page share a single lookup.
 *
 * Redirects: unauthenticated → login; authenticated-but-not-admin → home
 * (a soft 403 that doesn't reveal the admin area exists).
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const session = await getAppSession();
  if (!session) redirect("/en/login");

  const { db } = session;
  if (db.suspended || db.adminRole !== AdminRole.ADMIN) {
    redirect("/");
  }
  return { id: db.id, email: db.email, name: db.name };
});

/**
 * The Server-Action counterpart of `requireAdmin`: it THROWS instead of
 * redirecting (redirects are meaningless in an action), so a mutation aborts
 * before it touches the database when the caller isn't an admin. Returns the
 * acting admin's id for the audit trail. Read fresh from the DB every call —
 * never trust a cached role for a privileged write.
 */
export async function assertAdmin(): Promise<{ adminId: string }> {
  const session = await getAppSession();
  if (!session) throw new Error("unauthorized");

  const { db } = session;
  if (db.suspended || db.adminRole !== AdminRole.ADMIN) {
    throw new Error("forbidden");
  }
  return { adminId: db.id };
}

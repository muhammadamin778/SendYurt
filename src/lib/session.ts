import { redirect } from "next/navigation";
import { cache } from "react";
import { getAppSession } from "@/lib/supabase/app-session";

export type SessionUser = {
  id: string;
  role: string;
  householdId: string;
  /** "ADMIN" | "VIEWER" — read fresh from the DB on every request. */
  accessRole: string;
  /** Profile picture data URL, read fresh so the header/profile share it. */
  image?: string | null;
  name?: string | null;
  email?: string | null;
  /** "USER" | "ADMIN" — platform admin access, read fresh from the DB. */
  adminRole: string;
};

/**
 * Server-side session guard. Auth is Supabase (email/password); the session
 * is bridged to the Prisma `User` row so all household/budget/trust/remittance
 * features keep working. Middleware already protects these routes, but pages
 * re-check as defense in depth. Wrapped in React cache() so the layout and
 * page share one lookup per request.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getAppSession();
  if (!session) {
    redirect("/login");
  }
  const { db } = session;
  return {
    id: db.id,
    role: db.role,
    householdId: db.householdId,
    accessRole: db.accessRole,
    image: db.image,
    name: db.name,
    email: db.email,
    adminRole: db.adminRole,
  };
});

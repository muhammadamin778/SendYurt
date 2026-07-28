import type { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, isStaff, permissionsFor, type Permission } from "@/lib/permissions";
import { getAppSession } from "@/lib/supabase/app-session";

/**
 * Staff guards.
 *
 * Two entry points over one rule set (src/lib/permissions.ts):
 *
 *   requireStaff(permission?)  — for layouts and pages. REDIRECTS, so it
 *                                composes with the route-group layout.
 *   assertPermission(perm)     — for Server Actions. THROWS, so a mutation
 *                                aborts before touching the database.
 *
 * Both are needed. A Server Action is an addressable POST endpoint: it can be
 * invoked without ever rendering the panel, so guarding the layout alone
 * protects nothing. Hiding a button is UX; `assertPermission` is the authority.
 *
 * The role is read fresh from the database on every call (via the bridged
 * session), so a demotion takes effect immediately rather than at next login.
 */

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Everything this user may do — safe to pass into client components. */
  permissions: readonly Permission[];
  /** Convenience for branching inside a server component. */
  can: (permission: Permission) => boolean;
}

/**
 * Guard for Server Components. Redirects rather than throwing:
 * unauthenticated → login; not staff, or missing the required permission →
 * home (a soft 403 that doesn't confirm the panel exists).
 *
 * Wrapped in `cache()` so a layout and its page share one lookup per request.
 */
export const requireStaff = cache(async (permission?: Permission): Promise<StaffUser> => {
  const session = await getAppSession();
  if (!session) redirect("/en/login");

  const { db } = session;
  if (db.suspended || !isStaff(db.adminRole)) redirect("/");
  if (permission && !can(db.adminRole, permission)) redirect("/");

  return {
    id: db.id,
    email: db.email,
    name: db.name,
    role: db.adminRole,
    permissions: permissionsFor(db.adminRole),
    can: (p: Permission) => can(db.adminRole, p),
  };
});

/**
 * Guard for Server Actions. Throws `"unauthorized"` (no session) or
 * `"forbidden"` (a session without the permission) — both already mapped to a
 * stable error slug by every action's `toResult`.
 *
 * Deliberately NOT cached: a privileged write re-reads the role every time.
 * Returns the actor's id for the audit trail.
 */
export async function assertPermission(
  permission: Permission,
): Promise<{ adminId: string; role: AdminRole }> {
  const session = await getAppSession();
  if (!session) throw new Error("unauthorized");

  const { db } = session;
  if (db.suspended || !can(db.adminRole, permission)) {
    throw new Error("forbidden");
  }
  return { adminId: db.id, role: db.adminRole };
}

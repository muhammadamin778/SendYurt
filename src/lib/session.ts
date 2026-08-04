import { redirect } from "next/navigation";
import { cache } from "react";
import { getOperatorSession } from "@/lib/supabase/app-session";
import { getActiveImpersonation, minutesLeft } from "@/lib/impersonation";

/** Set only while an operator is viewing this account through "view as user". */
export interface ImpersonationContext {
  sessionId: string;
  /** The staff member looking. Named in the banner so it is never ambiguous. */
  operatorName: string;
  targetName: string;
  reason: string;
  /**
   * Minutes remaining at render. Kept for a correct first paint before the
   * client's interval starts; the banner counts down from `expiresAtIso`.
   */
  minutesLeft: number;
  /** Absolute expiry, so the countdown stays true across a slow render. */
  expiresAtIso: string;
}

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
  /**
   * Non-null while this render is a view-as session. The identity above is
   * then the *target's*, so pages load the customer's data without knowing
   * anything about impersonation — but the shell can render the banner, and
   * a surface that cannot honestly follow the switch can branch on it.
   */
  impersonating: ImpersonationContext | null;
};

/**
 * Server-side session guard. Auth is Supabase (email/password); the session
 * is bridged to the Prisma `User` row so all household/budget/trust/remittance
 * features keep working. Middleware already protects these routes, but pages
 * re-check as defense in depth. Wrapped in React cache() so the layout and
 * page share one lookup per request.
 *
 * With an active view-as grant this returns the **target's** identity. That is
 * what keeps the feature small: every page already reads `householdId` from
 * here, so reads follow the switch for free. Writes cannot — they go through
 * `getAppSession()`, which refuses while the grant is active.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getOperatorSession();
  if (!session) {
    redirect("/login");
  }

  const active = await getActiveImpersonation(session.db.id);
  const db = active ? active.target : session.db;

  return {
    id: db.id,
    role: db.role,
    householdId: db.householdId,
    accessRole: db.accessRole,
    image: db.image,
    name: db.name,
    email: db.email,
    // The target's tier, so the customer shell does not offer an admin link
    // that the operator would be stepping through sideways.
    adminRole: db.adminRole,
    impersonating: active
      ? {
          sessionId: active.sessionId,
          operatorName: session.db.name,
          targetName: active.target.name,
          reason: active.reason,
          minutesLeft: minutesLeft(active.expiresAt),
          expiresAtIso: active.expiresAt.toISOString(),
        }
      : null,
  };
});

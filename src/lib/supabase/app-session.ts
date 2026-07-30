import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { bridgeUser, type BridgedUser } from "@/lib/supabase/bridge";
import { getActiveImpersonation, READ_ONLY_ERROR } from "@/lib/impersonation";

export interface AppSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    householdId: string;
  };
  /** The full bridged Prisma user row (extra fields: accessRole, image, adminRole…). */
  db: BridgedUser;
}

/**
 * The signed-in user, bridged to their Prisma record — always the human whose
 * credentials are in play, never an impersonation target.
 *
 * Use this only where that distinction is the point: the staff guards, and
 * `requireUser()`, which layers view-as on top. Everything else wants
 * `getAppSession()`.
 *
 * Cached per request so repeated calls in one render share a single
 * Supabase + DB lookup.
 */
export const getOperatorSession = cache(async (): Promise<AppSession | null> => {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const db = await bridgeUser(user);
  if (!db || db.suspended) return null;

  return {
    user: { id: db.id, email: db.email, name: db.name, role: db.role, householdId: db.householdId },
    db,
  };
});

/**
 * Drop-in replacement for NextAuth's `getServerSession(authOptions)`: returns
 * the signed-in user or `null`.
 *
 * **This is the read-only chokepoint for "view as user".** Every server action
 * and API route in the app reaches its caller through here, so throwing while
 * a view-as session is active blocks writes in one place instead of in 26 —
 * and, more importantly, fails *closed*: a write path added next month is
 * covered without anyone remembering to guard it.
 *
 * It throws rather than returning null because null reads as "signed out",
 * which some callers answer with a redirect to login — the wrong outcome and a
 * confusing one. `read_only_session` is mapped to a stable slug by each
 * action's `toResult`.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const session = await getOperatorSession();
  if (!session) return null;

  if (await getActiveImpersonation(session.db.id)) {
    throw new Error(READ_ONLY_ERROR);
  }
  return session;
});

import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { bridgeUser, type BridgedUser } from "@/lib/supabase/bridge";

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
 * Drop-in replacement for NextAuth's `getServerSession(authOptions)`: returns
 * the signed-in user (bridged to the Prisma record) or `null`. Cached per
 * request so repeated calls in one render share a single Supabase + DB lookup.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
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

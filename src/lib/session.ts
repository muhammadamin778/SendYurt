import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
 * Server-side session guard. Middleware already protects these routes,
 * but pages re-check as defense in depth (middleware matchers can drift).
 *
 * The JWT can outlive its database rows — account deletion, or a demo
 * reseed that recreates the demo users with new ids. Rendering (and
 * especially writing) with those dead ids causes foreign-key crashes, so
 * the session is verified against the database and cleared when stale.
 * Wrapped in React cache() so the layout and page share one lookup per
 * request.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, householdId: true, accessRole: true, image: true, adminRole: true },
  });
  if (!dbUser || dbUser.householdId !== session.user.householdId) {
    // Server components can't delete cookies mid-render; a dedicated
    // route clears the dead session and lands on the login page.
    redirect("/api/clear-session");
  }

  return { ...session.user, accessRole: dbUser.accessRole, image: dbUser.image, adminRole: dbUser.adminRole };
});

import { AdminRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Server-side admin guard for layouts and pages (React Server Components).
 * The admin role is read fresh from the database on every request — a JWT
 * can outlive a demotion — and the check redirects rather than throwing so
 * it composes with `/admin/layout.tsx`. Wrapped in `cache()` so the layout
 * and the page it wraps share a single lookup per request.
 *
 * Redirects: unauthenticated → login; authenticated-but-not-admin → home
 * (a soft 403 that doesn't reveal the admin area exists).
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/en/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, adminRole: true, suspended: true },
  });
  if (!user || user.suspended || user.adminRole !== AdminRole.ADMIN) {
    redirect("/");
  }
  return { id: user.id, email: user.email, name: user.name };
});

/**
 * The Server-Action counterpart of `requireAdmin`: it THROWS instead of
 * redirecting (redirects are meaningless in an action), so a mutation aborts
 * before it touches the database when the caller isn't an admin. Returns the
 * acting admin's id for the audit trail. Read fresh from the DB every call —
 * never trust the session's cached role for a privileged write.
 */
export async function assertAdmin(): Promise<{ adminId: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, adminRole: true, suspended: true },
  });
  if (!user || user.suspended || user.adminRole !== AdminRole.ADMIN) {
    throw new Error("forbidden");
  }
  return { adminId: user.id };
}

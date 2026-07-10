import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export type SessionUser = {
  id: string;
  role: string;
  householdId: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Server-side session guard. Middleware already protects these routes,
 * but pages re-check as defense in depth (middleware matchers can drift).
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

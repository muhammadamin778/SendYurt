import { NextResponse } from "next/server";
import { getActiveImpersonation } from "@/lib/impersonation";
import { getAppSession, getOperatorSession } from "@/lib/supabase/app-session";
import { prisma } from "@/lib/prisma";

/**
 * The bell's contents — a read, so it follows a view-as session the same way
 * the pages do. Resolved explicitly rather than through `requireUser()`,
 * which redirects; a fetch wants a 401, not a 307.
 */
export async function GET() {
  const session = await getOperatorSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const active = await getActiveImpersonation(session.db.id);
  const userId = active ? active.target.id : session.user.id;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

/** Marks all of the caller's notifications as read. */
export async function POST() {
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

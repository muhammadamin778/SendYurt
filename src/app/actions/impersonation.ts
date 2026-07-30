"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/admin";
import { currentIp, logAudit, notifyAudit, type AuditEntry } from "@/lib/audit";
import { isStaff } from "@/lib/permissions";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_TTL_MINUTES,
} from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { getOperatorSession } from "@/lib/supabase/app-session";

/**
 * Starting and ending a "view as user" session.
 *
 * The grant itself lives in `ImpersonationSession`; the enforcement lives in
 * `src/lib/impersonation.ts` and the session chokepoint. This file is only the
 * two doors, and both are audited.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const KNOWN_ERRORS = new Set([
  "unauthorized",
  "forbidden",
  "read_only_session",
  "not_found",
  "self",
  "target_is_staff",
]);

function toResult(e: unknown): ActionResult {
  if (e instanceof Error && KNOWN_ERRORS.has(e.message)) {
    return { ok: false, error: e.message };
  }
  console.error("impersonation action failed", e);
  return { ok: false, error: "server" };
}

const startSchema = z.object({
  userId: z.string().min(1),
  /**
   * Free text, but not optional and not a shrug. This string is what an
   * auditor reads months later, so "checking" has to be more effort to type
   * than the real reason.
   */
  reason: z.string().trim().min(10, "reason_too_short").max(280),
});

/**
 * Open a read-only view of a customer's account.
 *
 * Guards, in order:
 *   • `customer.impersonate` — ADMIN and above; deliberately not SUPPORT.
 *   • A reason is mandatory.
 *   • You cannot view yourself (it would do nothing but muddy the trail).
 *   • You cannot view another staff member. Otherwise an ADMIN could read a
 *     SUPER_ADMIN's screens, which is privilege escalation wearing a costume.
 *
 * Any session this operator already had open is closed in the same
 * transaction, so "who was I viewing" always has exactly one answer.
 */
export async function startImpersonation(input: unknown): Promise<ActionResult> {
  try {
    const { adminId, role } = await assertPermission("customer.impersonate");
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
    }
    const { userId, reason } = parsed.data;

    if (userId === adminId) throw new Error("self");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, adminRole: true, suspended: true, householdId: true },
    });
    if (!target || target.suspended) throw new Error("not_found");
    if (isStaff(target.adminRole)) throw new Error("target_is_staff");

    const ip = await currentIp();
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MINUTES * 60_000);

    const entry: AuditEntry = {
      action: "IMPERSONATION_START",
      adminId,
      role,
      targetUserId: target.id,
      targetType: "User",
      ip,
      metadata: { reason, expiresAt: expiresAt.toISOString(), householdId: target.householdId },
    };

    const session = await prisma.$transaction(async (tx) => {
      // Supersede anything still open for this operator.
      await tx.impersonationSession.updateMany({
        where: { operatorId: adminId, endedAt: null },
        data: { endedAt: new Date() },
      });
      const created = await tx.impersonationSession.create({
        data: { operatorId: adminId, targetUserId: target.id, reason, expiresAt, ip },
      });
      await logAudit(tx, entry);
      return created;
    });

    // Only after the row is committed — a cookie pointing at a rolled-back
    // grant would resolve to nothing anyway, but this keeps the order honest.
    cookies().set(IMPERSONATION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: IMPERSONATION_TTL_MINUTES * 60,
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/**
 * Close the current view-as session.
 *
 * Guarded by "are you signed in", NOT by `assertPermission` — for two reasons.
 * `assertPermission` refuses while impersonating, so routing the exit through
 * it would wedge the operator inside the session. And an operator whose staff
 * role was revoked mid-session must still be able to get out; the row is
 * already inert by then, but the cookie should go too.
 *
 * Idempotent: exiting when there is nothing to exit clears the cookie and
 * reports success.
 */
export async function endImpersonation(): Promise<ActionResult> {
  try {
    const session = await getOperatorSession();
    if (!session) throw new Error("unauthorized");

    const jar = cookies();
    const sessionId = jar.get(IMPERSONATION_COOKIE)?.value;
    jar.delete(IMPERSONATION_COOKIE);

    if (sessionId) {
      const row = await prisma.impersonationSession.findUnique({ where: { id: sessionId } });
      // Ending someone else's grant is not this operator's to do.
      if (row && row.operatorId === session.db.id && !row.endedAt) {
        const endedAt = new Date();
        const entry: AuditEntry = {
          action: "IMPERSONATION_END",
          adminId: session.db.id,
          role: session.db.adminRole,
          targetUserId: row.targetUserId,
          targetType: "User",
          ip: await currentIp(),
          metadata: {
            reason: row.reason,
            durationSeconds: Math.round((endedAt.getTime() - row.startedAt.getTime()) / 1000),
          },
        };
        await prisma.$transaction(async (tx) => {
          await tx.impersonationSession.update({ where: { id: row.id }, data: { endedAt } });
          await logAudit(tx, entry);
        });
        await notifyAudit(entry);
      }
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

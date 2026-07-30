"use server";

import { revalidatePath } from "next/cache";
import { AdminRole } from "@prisma/client";
import { z } from "zod";
import { assertPermission } from "@/lib/admin";
import { currentIp, logAudit, notifyAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Maps thrown guard/known errors to a stable result shape. */
function toResult(e: unknown): ActionResult {
  if (e instanceof Error) {
    if (e.message === "unauthorized" || e.message === "forbidden" || e.message === "not_found" ||
      e.message === "last_super_admin" || e.message === "self" || e.message === "noop" ||
      e.message === "above_own_tier") {
      return fail(e.message);
    }
  }
  console.error("admin action failed", e);
  return fail("server");
}

const suspendSchema = z.object({ userId: z.string().min(1), suspended: z.boolean() });

/** Privilege ordering — used only to stop a grant above the actor's own tier. */
const RANK: Record<AdminRole, number> = {
  USER: 0,
  SUPPORT: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "SUPPORT", "ADMIN", "SUPER_ADMIN"]),
});

/**
 * Assign a staff tier explicitly.
 *
 * Replaces the old promote/demote pair, which was a boolean toggle over a
 * four-value enum: a SUPPORT user rendered "promote" and jumped straight to
 * ADMIN, and a SUPER_ADMIN rendered "demote" and dropped straight to USER.
 * Neither could express "make this person support staff".
 *
 * Guards, in order:
 *   • `staff.manage` — SUPER_ADMIN only.
 *   • You cannot change your OWN tier (no self-promotion, no self-lockout).
 *   • You cannot grant a tier above your own.
 *   • The last active SUPER_ADMIN cannot be moved off that tier — previously
 *     only self-demotion was blocked, so two super admins could demote each
 *     other to zero and lock everyone out of staff management permanently.
 *
 * The change and its audit entry share one transaction.
 */
export async function setStaffRole(input: unknown): Promise<ActionResult> {
  try {
    const { adminId, role: actorRole } = await assertPermission("staff.manage");
    const ip = await currentIp();

    const parsed = setRoleSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { userId, role } = parsed.data;

    if (userId === adminId) return fail("self");
    // Privilege escalation guard: granting a tier you don't hold yourself
    // would let an ADMIN mint a SUPER_ADMIN and inherit it back.
    if (RANK[role] > RANK[actorRole]) return fail("above_own_tier");

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, adminRole: true },
      });
      if (!target) throw new Error("not_found");
      if (target.adminRole === role) throw new Error("noop");
      // You may not demote a peer who outranks you either.
      if (RANK[target.adminRole] > RANK[actorRole]) throw new Error("above_own_tier");

      if (target.adminRole === AdminRole.SUPER_ADMIN) {
        const remaining = await tx.user.count({
          where: { adminRole: AdminRole.SUPER_ADMIN, suspended: false },
        });
        if (remaining <= 1) throw new Error("last_super_admin");
      }

      await tx.user.update({ where: { id: userId }, data: { adminRole: role } });
      await logAudit(tx, {
        action: "ROLE_CHANGE",
        adminId,
        role: actorRole,
        targetUserId: userId,
        targetType: "User",
        before: { adminRole: target.adminRole },
        after: { adminRole: role },
        ip,
      });
    });

    await notifyAudit({ action: "ROLE_CHANGE", adminId, targetUserId: userId, targetType: "User" });

    revalidatePath("/[locale]/(admin)/admin/users", "page");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function setUserSuspended(input: unknown): Promise<ActionResult> {
  try {
    const { adminId, role: actorRole } = await assertPermission("customer.suspend");
    const ip = await currentIp();
    const parsed = suspendSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { userId, suspended } = parsed.data;
    if (userId === adminId) return fail("self");

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, suspended: true },
      });
      if (!target) throw new Error("not_found");
      if (target.suspended === suspended) throw new Error("noop");

      await tx.user.update({ where: { id: userId }, data: { suspended } });
      await logAudit(tx, {
        action: suspended ? "USER_SUSPEND" : "USER_UNSUSPEND",
        adminId,
        role: actorRole,
        targetUserId: userId,
        targetType: "User",
        before: { suspended: target.suspended },
        after: { suspended },
        ip,
      });
    });

    // After commit — never inside the transaction (see notifyAudit).
    await notifyAudit({ action: suspended ? "USER_SUSPEND" : "USER_UNSUSPEND", adminId, targetUserId: userId, targetType: "User" });

    revalidatePath("/[locale]/(admin)/admin/users", "page");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

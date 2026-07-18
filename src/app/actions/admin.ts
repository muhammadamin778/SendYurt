"use server";

import { revalidatePath } from "next/cache";
import { AdminRole } from "@prisma/client";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Maps thrown guard/known errors to a stable result shape. */
function toResult(e: unknown): ActionResult {
  if (e instanceof Error) {
    if (e.message === "unauthorized" || e.message === "forbidden" || e.message === "not_found" || e.message === "self" || e.message === "noop") {
      return fail(e.message);
    }
  }
  console.error("admin action failed", e);
  return fail("server");
}

const userIdSchema = z.object({ userId: z.string().min(1) });
const suspendSchema = z.object({ userId: z.string().min(1), suspended: z.boolean() });

/**
 * Promote a user to ADMIN.
 *
 * Security: `assertAdmin()` re-checks the caller's role against the database
 * BEFORE any write — the session's cached role is never trusted for a
 * privileged mutation. The role change and its audit entry run in one
 * `$transaction`, so they commit or roll back together (requirement: no
 * promotion without a trail, no trail without a promotion).
 */
export async function promoteToAdmin(input: unknown): Promise<ActionResult> {
  try {
    const { adminId } = await assertAdmin();
    const parsed = userIdSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { userId } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, adminRole: true },
      });
      if (!target) throw new Error("not_found");
      if (target.adminRole === AdminRole.ADMIN) throw new Error("noop"); // already admin

      await tx.user.update({ where: { id: userId }, data: { adminRole: AdminRole.ADMIN } });
      await logAudit(tx, {
        action: "ROLE_PROMOTION",
        adminId,
        targetUserId: userId,
        targetType: "User",
        metadata: { from: target.adminRole, to: AdminRole.ADMIN },
      });
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/** Demote an admin back to USER (same guarded + audited + transactional shape). */
export async function demoteFromAdmin(input: unknown): Promise<ActionResult> {
  try {
    const { adminId } = await assertAdmin();
    const parsed = userIdSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { userId } = parsed.data;
    if (userId === adminId) return fail("self"); // an admin can't demote themselves

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, adminRole: true },
      });
      if (!target) throw new Error("not_found");
      if (target.adminRole !== AdminRole.ADMIN) throw new Error("noop");

      await tx.user.update({ where: { id: userId }, data: { adminRole: AdminRole.USER } });
      await logAudit(tx, {
        action: "ROLE_DEMOTION",
        adminId,
        targetUserId: userId,
        targetType: "User",
        metadata: { from: AdminRole.ADMIN, to: AdminRole.USER },
      });
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/**
 * Suspend / un-suspend an account — the reusable "protected CRUD" pattern the
 * task describes (an `updateUserBalance` would be identical: guard → validate
 * → `$transaction` { mutate + logAudit }). Kept real: this app has no wallet
 * balance to mutate, so we toggle a genuine `suspended` flag instead.
 */
export async function setUserSuspended(input: unknown): Promise<ActionResult> {
  try {
    const { adminId } = await assertAdmin();
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
        targetUserId: userId,
        targetType: "User",
        metadata: { suspended },
      });
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

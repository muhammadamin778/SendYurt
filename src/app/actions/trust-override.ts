"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/admin";
import { currentIp, logAudit, notifyAudit, type AuditEntry } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  MIN_OVERRIDE_REASON_LENGTH,
  OVERRIDE_REASON_CODES,
  effectiveScore,
  isValidDelta,
} from "@/lib/trust-override";

/**
 * Recording and retiring Trust Score adjustments.
 *
 * Follows the shape `transitionTransaction` established: guard → parse →
 * validate → one transaction → audit inside it → notify after it. The score
 * itself is never written; an override is a separate row applied on read, so
 * an adjusted score stays distinguishable from an earned one.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const KNOWN_ERRORS = new Set([
  "unauthorized",
  "forbidden",
  "read_only_session",
  "not_found",
  "invalid_delta",
  "invalid_reason",
  "already_revoked",
]);

function toResult(e: unknown): ActionResult {
  if (e instanceof Error && KNOWN_ERRORS.has(e.message)) {
    return { ok: false, error: e.message };
  }
  console.error("trust override action failed", e);
  return { ok: false, error: "server" };
}

const applySchema = z.object({
  householdId: z.string().min(1),
  delta: z.coerce.number().int(),
  reasonCode: z.enum(OVERRIDE_REASON_CODES),
  reason: z.string().trim().min(MIN_OVERRIDE_REASON_LENGTH, "invalid_reason").max(500),
});

/**
 * Record an adjustment on a household's score.
 *
 * At most one override is active at a time: applying a new one revokes the
 * previous in the same transaction. Stacking them would make "what is this
 * household's adjustment" a sum nobody can reconstruct from a single row.
 *
 * The audit entry carries the effective score before and after, because the
 * delta alone doesn't answer the question an auditor asks — a +10 that was
 * clamped away at a base of 95 changed nothing, and that should be visible.
 */
export async function applyTrustOverride(input: unknown): Promise<ActionResult> {
  try {
    const { adminId, role } = await assertPermission("trustscore.override");
    const parsed = applySchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(issue?.message === "invalid_reason" ? "invalid_reason" : "invalid_delta");
    }
    const { householdId, delta, reasonCode, reason } = parsed.data;

    // The cap is what keeps this a correction rather than a way to set the
    // score outright — see MAX_OVERRIDE_DELTA.
    if (!isValidDelta(delta)) throw new Error("invalid_delta");

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true },
    });
    if (!household) throw new Error("not_found");

    // The base is whatever the ledger currently says; read it for the audit
    // entry only. It is never written to.
    const latest = await prisma.trustScoreSnapshot.findFirst({
      where: { householdId },
      orderBy: { calculatedAt: "desc" },
      select: { score: true },
    });
    const base = latest?.score ?? 0;

    const previous = await prisma.trustScoreOverride.findFirst({
      where: { householdId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, delta: true },
    });

    const before = effectiveScore(base, previous?.delta ?? 0);
    const after = effectiveScore(base, delta);

    const entry: AuditEntry = {
      action: "TRUST_OVERRIDE_APPLY",
      adminId,
      role,
      targetType: "Household",
      ip: await currentIp(),
      before: { effectiveScore: before.effective, delta: previous?.delta ?? 0 },
      after: { effectiveScore: after.effective, delta, clamped: after.clamped },
      metadata: { householdId, baseScore: base, reasonCode, reason },
    };

    await prisma.$transaction(async (tx) => {
      if (previous) {
        await tx.trustScoreOverride.update({
          where: { id: previous.id },
          data: { revokedAt: new Date(), revokedById: adminId },
        });
      }
      await tx.trustScoreOverride.create({
        data: { householdId, delta, reasonCode, reason, actorId: adminId },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

const revokeSchema = z.object({ overrideId: z.string().min(1) });

/**
 * Retire an adjustment, returning the household to its computed score.
 *
 * The row is kept and marked, never deleted — an adjustment that was applied
 * for two months and then withdrawn is a fact about that household, and
 * deleting it would leave the score history unexplainable.
 */
export async function revokeTrustOverride(input: unknown): Promise<ActionResult> {
  try {
    const { adminId, role } = await assertPermission("trustscore.override");
    const parsed = revokeSchema.safeParse(input);
    if (!parsed.success) throw new Error("not_found");

    const row = await prisma.trustScoreOverride.findUnique({
      where: { id: parsed.data.overrideId },
      select: { id: true, householdId: true, delta: true, revokedAt: true },
    });
    if (!row) throw new Error("not_found");
    if (row.revokedAt) throw new Error("already_revoked");

    const latest = await prisma.trustScoreSnapshot.findFirst({
      where: { householdId: row.householdId },
      orderBy: { calculatedAt: "desc" },
      select: { score: true },
    });
    const base = latest?.score ?? 0;

    const entry: AuditEntry = {
      action: "TRUST_OVERRIDE_REVOKE",
      adminId,
      role,
      targetType: "Household",
      ip: await currentIp(),
      before: { effectiveScore: effectiveScore(base, row.delta).effective, delta: row.delta },
      after: { effectiveScore: base, delta: 0 },
      metadata: { householdId: row.householdId, baseScore: base, overrideId: row.id },
    };

    await prisma.$transaction(async (tx) => {
      await tx.trustScoreOverride.update({
        where: { id: row.id },
        data: { revokedAt: new Date(), revokedById: adminId },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Privileged actions we record. A union type keeps call sites honest — a typo
 * won't compile.
 */
export type AuditAction =
  | "ROLE_PROMOTION"
  | "ROLE_DEMOTION"
  | "USER_SUSPEND"
  | "USER_UNSUSPEND"
  | "DATA_EXPORT";

export interface AuditEntry {
  action: AuditAction;
  /** The admin performing the action (from `assertAdmin`). */
  adminId: string;
  /** The record acted upon, when applicable. */
  targetUserId?: string;
  targetType?: "User" | "Transaction" | "Household";
  /** Before/after values, reason, request metadata, etc. */
  metadata?: Prisma.InputJsonValue;
}

/**
 * Accepts either the base client or a `$transaction` client, so the audit
 * write can be enlisted in the SAME transaction as the mutation it records —
 * the change and its audit entry then commit or roll back together (never a
 * silent change with no trail, never a trail for a change that rolled back).
 *
 *   await prisma.$transaction(async (tx) => {
 *     await tx.user.update(...)
 *     await logAudit(tx, { action: "ROLE_PROMOTION", adminId, targetUserId })
 *   })
 */
type AuditDb = PrismaClient | Prisma.TransactionClient;

export async function logAudit(db: AuditDb, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      action: entry.action,
      adminId: entry.adminId,
      targetUserId: entry.targetUserId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? Prisma.JsonNull,
    },
  });
}

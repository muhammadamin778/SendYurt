import { Prisma, type PrismaClient } from "@prisma/client";
import { sendTelegramLog } from "@/lib/telegram";

/**
 * Privileged actions we record. A union type keeps call sites honest — a typo
 * won't compile.
 */
export type AuditAction =
  | "ROLE_PROMOTION"
  | "ROLE_DEMOTION"
  | "USER_SUSPEND"
  | "USER_UNSUSPEND"
  | "DATA_EXPORT"
  // Transaction state transitions. Every manual intervention on a financial
  // record is audited with the operator's reason code.
  | "TRANSACTION_CONFIRM"
  | "TRANSACTION_FAIL"
  | "TRANSACTION_DISPUTE"
  | "TRANSACTION_RESOLVE"
  | "TRANSACTION_REVERSE";

export interface AuditEntry {
  action: AuditAction;
  /** The admin performing the action (from `assertAdmin`). */
  adminId: string;
  /** The record acted upon, when applicable. */
  targetUserId?: string;
  targetType?: "User" | "Transaction" | "Household";
  /** Before/after values, reason code, request metadata, etc. */
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
 *
 * NOTE: this writes the row ONLY. The Telegram notification is deliberately
 * not sent here — see `notifyAudit`.
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

/**
 * Mirrors an audit entry to the Telegram log group.
 *
 * Call this AFTER the transaction commits, never inside it: the send is a
 * network round trip with a multi-second timeout, and holding a database
 * transaction open across it pins a connection and extends every lock the
 * transaction holds. (It previously ran inside `logAudit`, i.e. inside the
 * caller's `$transaction`.) It is fire-and-forget and never throws, so a
 * notification failure can't affect the recorded action.
 */
export async function notifyAudit(entry: AuditEntry): Promise<void> {
  await sendTelegramLog({
    category: "admin",
    title: entry.action,
    fields: {
      "Admin id": entry.adminId,
      Target: entry.targetUserId ? `${entry.targetType ?? "record"} ${entry.targetUserId}` : undefined,
    },
  });
}

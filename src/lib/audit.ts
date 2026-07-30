import { Prisma, type AdminRole, type PrismaClient } from "@prisma/client";
import { sendTelegramLog } from "@/lib/telegram";

/**
 * Every auditable action. A union keeps call sites honest — a typo won't
 * compile. Exported as a value so the audit viewer's filter is
 * driven by the same list the writers use — a new action can't become
 * un-filterable by omission.
 */
export const AUDIT_ACTIONS = [
  "ROLE_PROMOTION",
  "ROLE_DEMOTION",
  "ROLE_CHANGE",
  "USER_SUSPEND",
  "USER_UNSUSPEND",
  "DATA_EXPORT",
  "TRANSACTION_CONFIRM",
  "TRANSACTION_FAIL",
  "TRANSACTION_DISPUTE",
  "TRANSACTION_RESOLVE",
  "TRANSACTION_REVERSE",
  "IMPERSONATION_START",
  "IMPERSONATION_END",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];


export interface AuditEntry {
  action: AuditAction;
  /** The staff member performing the action (from `assertPermission`). */
  adminId: string;
  /**
   * Their tier at the time of the action. Recorded rather than joined, so a
   * later promotion or demotion cannot rewrite history — an auditor asks
   * "who was allowed to do this, then", not "what are they now".
   */
  role?: AdminRole | string;
  /** The record acted upon, when applicable. */
  targetUserId?: string;
  targetType?: "User" | "Transaction" | "Household";
  /** Snapshot before the change — render as a diff against `after`. */
  before?: Prisma.InputJsonValue;
  /** Snapshot after the change. */
  after?: Prisma.InputJsonValue;
  /** Request origin, from `clientIpFrom(headers())`. */
  ip?: string | null;
  /** Remaining context: reason codes, filters, row counts. */
  metadata?: Prisma.InputJsonValue;
}

/**
 * Best-effort request IP.
 *
 * Behind Vercel's proxy the original address is in `x-forwarded-for`, whose
 * first entry is the client; `x-real-ip` is the fallback. This is evidence,
 * not identity — a proxy header can be spoofed by anything upstream of us, so
 * it is recorded for correlation and never used for a decision.
 */
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}

/**
 * The current request's IP, or null.
 *
 * Deliberately swallows: `next/headers` throws when called outside a request
 * scope, and an audit *detail* must never be able to fail the action it
 * describes. Losing the origin on one row is a rounding error; losing a role
 * change because the header lookup threw is not.
 */
export async function currentIp(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    return clientIpFrom(headers());
  } catch {
    return null;
  }
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
      role: entry.role ?? null,
      targetUserId: entry.targetUserId ?? null,
      targetType: entry.targetType ?? null,
      before: entry.before ?? Prisma.JsonNull,
      after: entry.after ?? Prisma.JsonNull,
      ip: entry.ip ?? null,
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

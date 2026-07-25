import { Prisma, type PrismaClient } from "@prisma/client";
import { SYSTEM_REASON_CREATED } from "@/lib/reason-codes";
import type { TransactionEventName } from "@/lib/transaction-state";

/**
 * Writes to the append-only transition log.
 *
 * Accepts either the base client or a `$transaction` client — same pattern as
 * `logAudit` — so the event is written in the SAME transaction as the state
 * change it records. The two then commit or roll back together: there can
 * never be a state change with no event, or an event for a change that was
 * rolled back.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface TransitionEntry {
  transactionId: string;
  /** Null only on the creation row. */
  fromStatus: string | null;
  toStatus: string;
  event: TransactionEventName | "CREATE";
  /** The operator who acted; null for system/seed writes. */
  actorId?: string | null;
  reasonCode: string;
  note?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function recordTransactionEvent(db: Db, entry: TransitionEntry): Promise<void> {
  await db.transactionEvent.create({
    data: {
      transactionId: entry.transactionId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      event: entry.event,
      actorId: entry.actorId ?? null,
      reasonCode: entry.reasonCode,
      note: entry.note ?? null,
      metadata: entry.metadata ?? Prisma.JsonNull,
    },
  });
}

/** Convenience for the creation row, which has no prior state to record. */
export async function recordCreation(
  db: Db,
  transactionId: string,
  status: string,
  actorId?: string | null,
): Promise<void> {
  await recordTransactionEvent(db, {
    transactionId,
    fromStatus: null,
    toStatus: status,
    event: "CREATE",
    actorId: actorId ?? null,
    reasonCode: SYSTEM_REASON_CREATED,
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { logAudit, notifyAudit, type AuditAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isValidReasonCode } from "@/lib/reason-codes";
import { recordTransactionEvent } from "@/lib/transaction-events";
import {
  isTransactionEvent,
  transition,
  type TransactionEventName,
} from "@/lib/transaction-state";

/**
 * Operator-driven transaction state transitions.
 *
 * One entry point for every event, because the rules are identical regardless
 * of which button was pressed: the state machine decides whether the move is
 * legal, a reason code is mandatory, and the change plus its transition-log
 * entry plus its audit row commit together or not at all.
 *
 * The UI only renders the buttons `availableEvents()` permits, but that is
 * presentation — this server check is the authority, so a crafted request
 * cannot force an illegal transition.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

const schema = z.object({
  transactionId: z.string().min(1),
  event: z.string().min(1),
  reasonCode: z.string().min(1).max(40),
  note: z.string().trim().max(280).optional(),
});

/** Which audit action records which transition. */
const AUDIT_FOR: Record<TransactionEventName, AuditAction> = {
  CONFIRM: "TRANSACTION_CONFIRM",
  FAIL: "TRANSACTION_FAIL",
  DISPUTE: "TRANSACTION_DISPUTE",
  RESOLVE_VALID: "TRANSACTION_RESOLVE",
  RESOLVE_UPHELD: "TRANSACTION_RESOLVE",
  REVERSE: "TRANSACTION_REVERSE",
};

export async function transitionTransaction(input: unknown): Promise<ActionResult> {
  try {
    const { adminId } = await assertAdmin();

    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { transactionId, event, reasonCode, note } = parsed.data;

    if (!isTransactionEvent(event)) return fail("unknown_event");
    if (!isValidReasonCode(event, reasonCode)) return fail("invalid_reason");

    const auditAction = AUDIT_FOR[event];

    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findUnique({
        where: { id: transactionId },
        select: { id: true, status: true, type: true, amount: true, goalId: true, senderId: true },
      });
      if (!txn) throw new Error("not_found");

      const step = transition(txn.status, event);
      if (!step.ok) throw new Error("illegal_transition");

      await tx.transaction.update({ where: { id: txn.id }, data: { status: step.to } });

      await recordTransactionEvent(tx, {
        transactionId: txn.id,
        fromStatus: txn.status,
        toStatus: step.to,
        event,
        actorId: adminId,
        reasonCode,
        note,
      });

      // Landing in REVERSED must undo the balances the row had moved,
      // whichever route got it there (direct reversal or an upheld dispute).
      if (step.to === "REVERSED") {
        if (txn.type === "SAVINGS" && txn.goalId) {
          await tx.savingsGoal.updateMany({
            where: { id: txn.goalId, currentAmount: { gte: txn.amount } },
            data: { currentAmount: { decrement: txn.amount } },
          });
        } else if (txn.type === "REMITTANCE" && txn.senderId) {
          const card = await tx.card.findFirst({
            where: { userId: txn.senderId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true },
          });
          if (card) {
            await tx.card.update({
              where: { id: card.id },
              data: { balance: { increment: txn.amount } },
            });
          }
        }
      }

      await logAudit(tx, {
        action: auditAction,
        adminId,
        targetType: "Transaction",
        metadata: {
          transactionId: txn.id,
          event,
          from: txn.status,
          to: step.to,
          reasonCode,
          note: note ?? null,
        },
      });
    });

    // After commit — a network call must not hold the transaction open.
    await notifyAudit({ action: auditAction, adminId, targetType: "Transaction" });

    revalidatePath("/[locale]/(admin)/admin/transactions", "page");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.message === "unauthorized" ||
        e.message === "forbidden" ||
        e.message === "not_found" ||
        e.message === "illegal_transition"
      ) {
        return fail(e.message);
      }
    }
    console.error("transitionTransaction failed", e);
    return fail("server");
  }
}

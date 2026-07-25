"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import { logAudit } from "@/lib/audit";
import { isCategory } from "@/lib/categories";
import { addMinor, toBigInt, toMinor } from "@/lib/money";
import { crossedNearThreshold, notifyHousehold } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isValidReasonCode } from "@/lib/reason-codes";
import { recordCreation, recordTransactionEvent } from "@/lib/transaction-events";
import { transition } from "@/lib/transaction-state";
import {
  budgetSchema,
  contributionSchema,
  expenseSchema,
  incomeSchema,
  savingsGoalSchema,
  updateGoalSchema,
} from "@/lib/validators";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Every budget mutation requires ADMIN access inside the household --
 * VIEWER members are read-only. Access is read fresh from the DB so a
 * demotion takes effect immediately, not at next login.
 */
async function requireHousehold(): Promise<{ householdId: string; userId: string }> {
  const session = await getAppSession();
  if (!session?.user?.id) {
    throw new Error("unauthorized");
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { householdId: true, accessRole: true },
  });
  if (!dbUser) throw new Error("unauthorized");
  if (dbUser.accessRole !== "ADMIN") throw new Error("forbidden");
  return { householdId: dbUser.householdId, userId: session.user.id };
}

function actionError(e: unknown): ActionResult | null {
  if (e instanceof Error && (e.message === "forbidden" || e.message === "unauthorized")) {
    return fail(e.message);
  }
  return null;
}

function revalidateBudget() {
  revalidatePath("/[locale]/(app)/budget", "page");
  revalidatePath("/[locale]/(app)/dashboard", "page");
  revalidatePath("/[locale]/(app)/trust", "page");
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Returns true when this key has already produced a record — an idempotent
 * replay of a retried or double-clicked submission.
 */
async function alreadyRecorded(key: string | undefined): Promise<boolean> {
  if (!key) return false;
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: key },
    select: { id: true },
  });
  return existing !== null;
}

/** A unique-constraint violation on the key means the original already committed. */
function isReplayRace(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function addExpense(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    if (!isCategory(parsed.data.category)) return fail("validation");
    if (await alreadyRecorded(parsed.data.idempotencyKey)) return { ok: true };

    const created = await prisma.transaction.create({
      data: {
        householdId,
        idempotencyKey: parsed.data.idempotencyKey ?? null,
        type: "EXPENSE",
        amount: toBigInt(parsed.data.amount),
        currency: "UZS",
        category: parsed.data.category,
        note: parsed.data.note || null,
        date: parsed.data.date,
        status: "COMPLETED",
      },
      select: { id: true, status: true },
    });
    await recordCreation(prisma, created.id, created.status);
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    if (isReplayRace(e)) return { ok: true };
    const known = actionError(e);
    if (known) return known;
    console.error("addExpense failed", e);
    return fail("server");
  }
}

export async function addIncome(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = incomeSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    if (await alreadyRecorded(parsed.data.idempotencyKey)) return { ok: true };

    const created = await prisma.transaction.create({
      data: {
        householdId,
        idempotencyKey: parsed.data.idempotencyKey ?? null,
        type: "INCOME",
        amount: toBigInt(parsed.data.amount),
        currency: "UZS",
        note: parsed.data.note || null,
        date: parsed.data.date,
        status: "COMPLETED",
      },
      select: { id: true, status: true },
    });
    await recordCreation(prisma, created.id, created.status);
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    if (isReplayRace(e)) return { ok: true };
    const known = actionError(e);
    if (known) return known;
    console.error("addIncome failed", e);
    return fail("server");
  }
}

const reverseSchema = z.object({
  id: z.string().min(1),
  reasonCode: z.string().min(1).max(40),
  note: z.string().trim().max(280).optional(),
});

/**
 * Reverses a transaction instead of deleting it.
 *
 * History is append-only: the row is never destroyed, it moves to REVERSED and
 * gains a transition-log entry recording who did it and why. Because every
 * balance and the Trust Score count only COMPLETED rows, reversing removes the
 * amount from all totals without erasing the evidence that it happened.
 *
 * The compensation is the part the old hard delete got wrong: deleting a
 * SAVINGS row left `SavingsGoal.currentAmount` untouched, so the goal and its
 * contributions permanently disagreed. Here the goal is decremented and a
 * remittance's card debit is credited back, in the same transaction as the
 * state change.
 */
export async function reverseTransaction(input: unknown): Promise<ActionResult> {
  try {
    const { householdId, userId } = await requireHousehold();
    const parsed = reverseSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { id, reasonCode, note } = parsed.data;

    if (!isValidReasonCode("REVERSE", reasonCode)) return fail("invalid_reason");

    await prisma.$transaction(async (tx) => {
      // Scoped read: a user can only act on rows in their own household.
      const txn = await tx.transaction.findFirst({
        where: { id, householdId },
        select: { id: true, type: true, status: true, amount: true, goalId: true, senderId: true },
      });
      if (!txn) throw new Error("not_found");

      // The state machine decides whether this is legal at all.
      const step = transition(txn.status, "REVERSE");
      if (!step.ok) throw new Error("illegal_transition");

      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: step.to },
      });

      await recordTransactionEvent(tx, {
        transactionId: txn.id,
        fromStatus: txn.status,
        toStatus: step.to,
        event: "REVERSE",
        actorId: userId,
        reasonCode,
        note,
        metadata: { type: txn.type, amount: txn.amount.toString() },
      });

      // Compensate the balances this row had moved.
      if (txn.type === "SAVINGS" && txn.goalId) {
        // Guarded so a goal can never be driven below zero by a reversal.
        await tx.savingsGoal.updateMany({
          where: { id: txn.goalId, currentAmount: { gte: txn.amount } },
          data: { currentAmount: { decrement: txn.amount } },
        });
      } else if (txn.type === "REMITTANCE" && txn.senderId) {
        // Credit the funding card back. The default card is the one the
        // transfer flow debits.
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

      await logAudit(tx, {
        action: "TRANSACTION_REVERSE",
        adminId: userId,
        targetType: "Transaction",
        metadata: { transactionId: txn.id, reasonCode, note: note ?? null },
      });
    });

    revalidateBudget();
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && (e.message === "not_found" || e.message === "illegal_transition")) {
      return fail(e.message);
    }
    const known = actionError(e);
    if (known) return known;
    console.error("reverseTransaction failed", e);
    return fail("server");
  }
}

export async function setBudget(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = budgetSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    if (!isCategory(parsed.data.category)) return fail("validation");

    await prisma.budget.upsert({
      where: {
        householdId_category_period: {
          householdId,
          category: parsed.data.category,
          period: parsed.data.period,
        },
      },
      update: { amountAllocated: toBigInt(parsed.data.amountAllocated) },
      create: {
        householdId,
        category: parsed.data.category,
        period: parsed.data.period,
        amountAllocated: toBigInt(parsed.data.amountAllocated),
      },
    });
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    console.error("setBudget failed", e);
    return fail("server");
  }
}

export async function addSavingsGoal(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = savingsGoalSchema.safeParse(input);
    if (!parsed.success) return fail("validation");

    await prisma.savingsGoal.create({
      data: {
        householdId,
        name: parsed.data.name,
        targetAmount: toBigInt(parsed.data.targetAmount),
        targetDate: parsed.data.targetDate ?? null,
      },
    });
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    console.error("addSavingsGoal failed", e);
    return fail("server");
  }
}

export async function updateSavingsGoal(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = updateGoalSchema.safeParse(input);
    if (!parsed.success) return fail("validation");

    const goal = await prisma.savingsGoal.findFirst({
      where: { id: parsed.data.goalId, householdId },
      select: { id: true },
    });
    if (!goal) return fail("not_found");

    await prisma.savingsGoal.update({
      where: { id: goal.id },
      data: {
        name: parsed.data.name,
        targetAmount: toBigInt(parsed.data.targetAmount),
        targetDate: parsed.data.targetDate ?? null,
      },
    });
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    console.error("updateSavingsGoal failed", e);
    return fail("server");
  }
}

export async function contributeToGoal(input: unknown): Promise<ActionResult> {
  try {
    const { householdId, userId } = await requireHousehold();
    const parsed = contributionSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { goalId, amount, note, idempotencyKey } = parsed.data;
    // Replay guard: without this, a double click both increments the goal
    // twice and writes two SAVINGS rows.
    if (await alreadyRecorded(idempotencyKey)) return { ok: true };

    // The goal update and the ledger entry must land together.
    const crossed = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, householdId },
      });
      if (!goal) throw new Error("not_found");

      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { increment: toBigInt(amount) } },
      });
      // The savings row is tied to the goal + contributor so the goal-detail
      // view can show real contributors and contribution history.
      const created = await tx.transaction.create({
        data: {
          householdId,
          idempotencyKey: idempotencyKey ?? null,
          type: "SAVINGS",
          amount: toBigInt(amount),
          currency: "UZS",
          goalId: goal.id,
          senderId: userId,
          note: note && note.length > 0 ? note : goal.name,
          date: new Date(),
          status: "COMPLETED",
        },
        select: { id: true, status: true },
      });
      await recordCreation(tx, created.id, created.status, userId);

      const before = toMinor(goal.currentAmount);
      const target = toMinor(goal.targetAmount);
      const after = addMinor(before, amount);
      return crossedNearThreshold(before, after, target)
        ? {
            name: goal.name,
            percent: Math.min(100, Math.round((after / target) * 100)),
          }
        : null;
    });

    if (crossed) {
      await notifyHousehold(householdId, "GOAL_NEAR", {
        goal: crossed.name,
        percent: crossed.percent,
      });
    }
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    if (e instanceof Error && e.message === "not_found") return fail("not_found");
    console.error("contributeToGoal failed", e);
    return fail("server");
  }
}


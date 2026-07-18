"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { crossedNearThreshold, notifyHousehold } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
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
  const session = await getServerSession(authOptions);
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

export async function addExpense(input: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    if (!isCategory(parsed.data.category)) return fail("validation");

    await prisma.transaction.create({
      data: {
        householdId,
        type: "EXPENSE",
        amount: parsed.data.amount,
        currency: "UZS",
        category: parsed.data.category,
        note: parsed.data.note || null,
        date: parsed.data.date,
        status: "COMPLETED",
      },
    });
    revalidateBudget();
    return { ok: true };
  } catch (e) {
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

    await prisma.transaction.create({
      data: {
        householdId,
        type: "INCOME",
        amount: parsed.data.amount,
        currency: "UZS",
        note: parsed.data.note || null,
        date: parsed.data.date,
        status: "COMPLETED",
      },
    });
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    console.error("addIncome failed", e);
    return fail("server");
  }
}

export async function deleteTransaction(id: unknown): Promise<ActionResult> {
  try {
    const { householdId } = await requireHousehold();
    const parsedId = z.string().min(1).safeParse(id);
    if (!parsedId.success) return fail("validation");

    // Scoped delete: a user can only remove rows of their own household.
    const result = await prisma.transaction.deleteMany({
      where: { id: parsedId.data, householdId },
    });
    if (result.count === 0) return fail("not_found");
    revalidateBudget();
    return { ok: true };
  } catch (e) {
    const known = actionError(e);
    if (known) return known;
    console.error("deleteTransaction failed", e);
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
      update: { amountAllocated: parsed.data.amountAllocated },
      create: {
        householdId,
        category: parsed.data.category,
        period: parsed.data.period,
        amountAllocated: parsed.data.amountAllocated,
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
        targetAmount: parsed.data.targetAmount,
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
        targetAmount: parsed.data.targetAmount,
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
    const { goalId, amount, note } = parsed.data;

    // The goal update and the ledger entry must land together.
    const crossed = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, householdId },
      });
      if (!goal) throw new Error("not_found");

      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { increment: amount } },
      });
      // The savings row is tied to the goal + contributor so the goal-detail
      // view can show real contributors and contribution history.
      await tx.transaction.create({
        data: {
          householdId,
          type: "SAVINGS",
          amount,
          currency: "UZS",
          goalId: goal.id,
          senderId: userId,
          note: note && note.length > 0 ? note : goal.name,
          date: new Date(),
          status: "COMPLETED",
        },
      });

      const before = goal.currentAmount.toNumber();
      const target = goal.targetAmount.toNumber();
      return crossedNearThreshold(before, before + amount, target)
        ? {
            name: goal.name,
            percent: Math.min(100, Math.round(((before + amount) / target) * 100)),
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


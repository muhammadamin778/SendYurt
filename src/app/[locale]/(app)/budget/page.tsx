import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Everything behind auth is per-household — never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * "Family Budget" now opens the Goal Details view for the household's primary
 * savings goal (the largest target). The full budget dashboard — transactions,
 * category budgets, income/expense — lives at /budget/manage.
 */
export default async function BudgetPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const user = await requireUser();
  const goal = await prisma.savingsGoal.findFirst({
    where: { householdId: user.householdId },
    orderBy: [{ targetAmount: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  redirect(goal ? `/${locale}/budget/goals/${goal.id}` : `/${locale}/budget/manage`);
}

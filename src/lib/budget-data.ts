import { prisma } from "@/lib/prisma";

export interface MonthSummary {
  incomeUzs: number; // INCOME + REMITTANCE received
  spentUzs: number; // EXPENSE
  savedUzs: number; // SAVINGS
}

export interface MonthPoint extends MonthSummary {
  period: string; // "YYYY-MM"
  monthStart: Date;
}

export interface CategorySpend {
  category: string;
  spentUzs: number;
  allocatedUzs: number | null;
}

export interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  currency: string;
  category: string | null;
  note: string | null;
  date: Date;
  isDemo: boolean;
  providerName: string | null;
  sourceAmount: number | null;
  sourceCurrency: string | null;
}

export interface GoalRow {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function periodRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function sumByTypes(
  householdId: string,
  start: Date,
  end: Date,
): Promise<Record<string, number>> {
  const groups = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      householdId,
      status: "COMPLETED",
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  const result: Record<string, number> = {};
  for (const g of groups) {
    result[g.type] = g._sum.amount?.toNumber() ?? 0;
  }
  return result;
}

export async function getMonthSummary(
  householdId: string,
  period: string,
): Promise<MonthSummary> {
  const { start, end } = periodRange(period);
  const sums = await sumByTypes(householdId, start, end);
  return {
    incomeUzs: (sums.INCOME ?? 0) + (sums.REMITTANCE ?? 0),
    spentUzs: sums.EXPENSE ?? 0,
    savedUzs: sums.SAVINGS ?? 0,
  };
}

/** Last `count` months ending at `period`, oldest first — feeds the chart. */
export async function getMonthlyTrend(
  householdId: string,
  period: string,
  count = 6,
): Promise<MonthPoint[]> {
  const points: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const p = shiftPeriod(period, -i);
    const summary = await getMonthSummary(householdId, p);
    points.push({ period: p, monthStart: periodRange(p).start, ...summary });
  }
  return points;
}

export async function getCategorySpend(
  householdId: string,
  period: string,
): Promise<CategorySpend[]> {
  const { start, end } = periodRange(period);
  const [spendGroups, budgets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        householdId,
        type: "EXPENSE",
        status: "COMPLETED",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({ where: { householdId, period } }),
  ]);

  const byCategory = new Map<string, CategorySpend>();
  for (const b of budgets) {
    byCategory.set(b.category, {
      category: b.category,
      spentUzs: 0,
      allocatedUzs: b.amountAllocated.toNumber(),
    });
  }
  for (const g of spendGroups) {
    const category = g.category ?? "other";
    const spent = g._sum.amount?.toNumber() ?? 0;
    const existing = byCategory.get(category);
    if (existing) {
      existing.spentUzs = spent;
    } else {
      byCategory.set(category, { category, spentUzs: spent, allocatedUzs: null });
    }
  }

  return Array.from(byCategory.values()).sort(
    (a, b) => (b.allocatedUzs ?? b.spentUzs) - (a.allocatedUzs ?? a.spentUzs),
  );
}

export async function getTransactions(
  householdId: string,
  period: string,
): Promise<TransactionRow[]> {
  const { start, end } = periodRange(period);
  const rows = await prisma.transaction.findMany({
    where: { householdId, date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
    include: { provider: { select: { name: true } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount.toNumber(),
    currency: r.currency,
    category: r.category,
    note: r.note,
    date: r.date,
    isDemo: r.isDemo,
    providerName: r.provider?.name ?? null,
    sourceAmount: r.sourceAmount?.toNumber() ?? null,
    sourceCurrency: r.sourceCurrency,
  }));
}

export async function getSavingsGoals(householdId: string): Promise<GoalRow[]> {
  const goals = await prisma.savingsGoal.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
  });
  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount.toNumber(),
    currentAmount: g.currentAmount.toNumber(),
    targetDate: g.targetDate,
  }));
}

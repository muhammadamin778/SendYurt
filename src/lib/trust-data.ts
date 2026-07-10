import type { TimelineMonth } from "@/components/trust/RemittanceTimeline";
import { computeMilestones, type Milestone } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { computeTrustScore, type TrustScoreResult } from "@/lib/trust-score";

export interface SnapshotRow {
  score: number;
  consistencyFactor: number;
  stabilityFactor: number;
  savingsFactor: number;
  calculatedAt: Date;
}

export interface TrustData {
  result: TrustScoreResult;
  calculatedAt: Date;
  hasDemoData: boolean;
  timeline: TimelineMonth[];
  milestones: Milestone[];
  history: SnapshotRow[];
}

/**
 * Recomputes the score from the ledger and persists a snapshot when the
 * score changed or the latest snapshot is older than a day — the
 * household accumulates an auditable score history. Shared by the trust
 * page and the printable report.
 */
export async function getTrustData(householdId: string): Promise<TrustData> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 13);

  const [transactions, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId, status: "COMPLETED", date: { gte: since } },
      select: { type: true, amount: true, date: true, isDemo: true },
    }),
    prisma.savingsGoal.findMany({
      where: { householdId },
      select: { currentAmount: true, targetAmount: true },
    }),
  ]);

  const result = computeTrustScore(
    transactions.map((t) => ({
      type: t.type,
      amount: t.amount.toNumber(),
      date: t.date,
    })),
  );

  const latest = await prisma.trustScoreSnapshot.findFirst({
    where: { householdId },
    orderBy: { calculatedAt: "desc" },
  });

  const staleMs = 24 * 60 * 60 * 1000;
  let calculatedAt = latest?.calculatedAt ?? new Date();
  if (
    !latest ||
    latest.score !== result.score ||
    Date.now() - latest.calculatedAt.getTime() > staleMs
  ) {
    const snapshot = await prisma.trustScoreSnapshot.create({
      data: {
        householdId,
        score: result.score,
        consistencyFactor: result.consistency.score,
        stabilityFactor: result.stability.score,
        savingsFactor: result.savings.score,
      },
    });
    calculatedAt = snapshot.calculatedAt;
  }

  // Last 12 calendar months of remittance arrivals, oldest first.
  const byMonth = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "REMITTANCE") continue;
    const key = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + tx.amount.toNumber());
  }
  const now = new Date();
  const timeline: TimelineMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    timeline.push({
      key,
      monthStartIso: d.toISOString(),
      amountUzs: byMonth.get(key) ?? null,
      isCurrent: i === 0,
    });
  }

  const milestones = computeMilestones(
    transactions.map((t) => ({ type: t.type, date: t.date })),
    goals.map((g) => ({
      currentAmount: g.currentAmount.toNumber(),
      targetAmount: g.targetAmount.toNumber(),
    })),
  );

  const history = await prisma.trustScoreSnapshot.findMany({
    where: { householdId },
    orderBy: { calculatedAt: "desc" },
    take: 6,
    select: {
      score: true,
      consistencyFactor: true,
      stabilityFactor: true,
      savingsFactor: true,
      calculatedAt: true,
    },
  });

  return {
    result,
    calculatedAt,
    hasDemoData: transactions.some((t) => t.isDemo),
    timeline,
    milestones,
    history,
  };
}

/**
 * SendYurt Trust Score — a transparent 0–100 indicator of a household's
 * financial reliability, built from three explainable factors:
 *
 *   consistency (40%) — how regularly money arrives from abroad
 *   stability   (30%) — how steady the monthly amounts are
 *   savings     (30%) — whether the family sets money aside
 *
 * The score is deliberately simple to explain: every factor can be shown
 * to the family with the exact numbers behind it. It is NOT a credit
 * score; it's a habit mirror that families can improve month by month.
 */

export interface TrustInput {
  type: string; // REMITTANCE | SAVINGS | INCOME | EXPENSE
  amount: number; // UZS
  date: Date;
}

export interface TrustScoreResult {
  score: number; // 0-100
  consistency: FactorResult;
  stability: FactorResult;
  savings: FactorResult;
  /** Months in the evaluation window, most recent last ("YYYY-MM"). */
  windowMonths: string[];
  hasEnoughData: boolean;
}

export interface FactorResult {
  score: number; // 0-100
  weight: number; // fraction of the total
  details: Record<string, number>;
}

const WEIGHTS = { consistency: 0.4, stability: 0.3, savings: 0.3 } as const;
/** Look back at most this many full months. */
const WINDOW = 12;
/** Below this many months of history the score is marked provisional. */
const MIN_MONTHS = 3;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(now: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function computeTrustScore(
  transactions: TrustInput[],
  now: Date = new Date(),
): TrustScoreResult {
  // Bucket completed transactions by month within the window.
  const remittanceByMonth = new Map<string, number>();
  const savingsByMonth = new Map<string, number>();
  let totalIncome = 0;
  let totalSaved = 0;

  for (const tx of transactions) {
    const key = monthKey(tx.date);
    if (tx.type === "REMITTANCE") {
      remittanceByMonth.set(key, (remittanceByMonth.get(key) ?? 0) + tx.amount);
    } else if (tx.type === "SAVINGS") {
      savingsByMonth.set(key, (savingsByMonth.get(key) ?? 0) + tx.amount);
      totalSaved += tx.amount;
    }
    if (tx.type === "INCOME" || tx.type === "REMITTANCE") {
      totalIncome += tx.amount;
    }
  }

  // Evaluation window: from the first month with a remittance (or savings
  // deposit) within the last 12 months, up to the current month. A young
  // household isn't punished for months before it existed.
  const allWindow = lastMonths(now, WINDOW);
  const firstActiveIdx = allWindow.findIndex(
    (m) => remittanceByMonth.has(m) || savingsByMonth.has(m),
  );
  const windowMonths = firstActiveIdx === -1 ? [] : allWindow.slice(firstActiveIdx);
  const monthsConsidered = windowMonths.length;
  const hasEnoughData = monthsConsidered >= MIN_MONTHS;

  // --- Factor 1: consistency -------------------------------------------
  const activeMonths = windowMonths.filter((m) => remittanceByMonth.has(m)).length;
  const consistencyScore =
    monthsConsidered === 0 ? 0 : clamp((activeMonths / monthsConsidered) * 100);

  // --- Factor 2: amount stability --------------------------------------
  // Coefficient of variation of monthly remittance totals across active
  // months: cv 0 → 100 points, cv ≥ 0.5 → 0 points, linear in between.
  const amounts = windowMonths
    .map((m) => remittanceByMonth.get(m))
    .filter((v): v is number => v !== undefined);
  let stabilityScore: number;
  let cv = 0;
  if (amounts.length < 2) {
    stabilityScore = amounts.length === 1 ? 50 : 0; // neutral / no data
  } else {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((acc, v) => acc + (v - mean) ** 2, 0) / amounts.length;
    cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    stabilityScore = clamp(100 - cv * 200);
  }

  // --- Factor 3: savings behavior --------------------------------------
  // 70% for saving regularly, 30% for the saved share of family income
  // (10% of income saved = full marks on that part).
  const savingsMonths = windowMonths.filter((m) => savingsByMonth.has(m)).length;
  const savingsRegularity =
    monthsConsidered === 0 ? 0 : savingsMonths / monthsConsidered;
  const savingsRate = totalIncome > 0 ? totalSaved / totalIncome : 0;
  const savingsScore = clamp(
    savingsRegularity * 70 + Math.min(1, savingsRate / 0.1) * 30,
  );

  const score = Math.round(
    consistencyScore * WEIGHTS.consistency +
      stabilityScore * WEIGHTS.stability +
      savingsScore * WEIGHTS.savings,
  );

  return {
    score,
    hasEnoughData,
    windowMonths,
    consistency: {
      score: Math.round(consistencyScore),
      weight: WEIGHTS.consistency,
      details: { activeMonths, monthsConsidered },
    },
    stability: {
      score: Math.round(stabilityScore),
      weight: WEIGHTS.stability,
      details: {
        variationPercent: Math.round(cv * 100),
        activeMonths: amounts.length,
      },
    },
    savings: {
      score: Math.round(savingsScore),
      weight: WEIGHTS.savings,
      details: {
        savingsMonths,
        monthsConsidered,
        savingsRatePercent: Math.round(savingsRate * 100),
      },
    },
  };
}

/** Improvement tips keyed to whichever factors are lagging. */
export function improvementTips(result: TrustScoreResult): string[] {
  const tips: string[] = [];
  if (!result.hasEnoughData) tips.push("keepGoing");
  if (result.consistency.score < 85) tips.push("consistency");
  if (result.stability.score < 70) tips.push("stability");
  if (result.savings.score < 70) tips.push("savings");
  if (tips.length === 0) tips.push("maintain");
  return tips;
}

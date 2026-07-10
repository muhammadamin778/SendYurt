/**
 * Achievement milestones — "quiet pride", computed live from the ledger.
 * Deliberately few, meaningful, and phrased as family accomplishments
 * rather than game rewards.
 */

export interface MilestoneInput {
  type: string;
  date: Date;
}

export interface GoalInput {
  currentAmount: number;
  targetAmount: number;
}

export const MILESTONE_IDS = [
  "firstTransfer",
  "streak3",
  "streak6",
  "steadySaver",
  "goalReached",
] as const;

export type MilestoneId = (typeof MILESTONE_IDS)[number];

export interface Milestone {
  id: MilestoneId;
  earned: boolean;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Longest run of consecutive calendar months present in `keys`. */
function longestStreak(keys: Set<string>): number {
  let best = 0;
  for (const key of Array.from(keys)) {
    const [y, m] = key.split("-").map(Number);
    // Only count from the start of a run.
    const prev = new Date(Date.UTC(y, m - 2, 1));
    if (keys.has(monthKey(prev))) continue;
    let length = 0;
    let cursor = new Date(Date.UTC(y, m - 1, 1));
    while (keys.has(monthKey(cursor))) {
      length++;
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    best = Math.max(best, length);
  }
  return best;
}

export function computeMilestones(
  transactions: MilestoneInput[],
  goals: GoalInput[],
): Milestone[] {
  const remittanceMonths = new Set<string>();
  const savingsMonths = new Set<string>();
  let hasTransfer = false;

  for (const tx of transactions) {
    if (tx.type === "REMITTANCE") {
      hasTransfer = true;
      remittanceMonths.add(monthKey(tx.date));
    } else if (tx.type === "SAVINGS") {
      savingsMonths.add(monthKey(tx.date));
    }
  }

  const remitStreak = longestStreak(remittanceMonths);
  const saveStreak = longestStreak(savingsMonths);
  const goalReached = goals.some(
    (g) => g.targetAmount > 0 && g.currentAmount >= g.targetAmount,
  );

  return [
    { id: "firstTransfer", earned: hasTransfer },
    { id: "streak3", earned: remitStreak >= 3 },
    { id: "streak6", earned: remitStreak >= 6 },
    { id: "steadySaver", earned: saveStreak >= 3 },
    { id: "goalReached", earned: goalReached },
  ];
}

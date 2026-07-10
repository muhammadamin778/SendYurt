import { describe, expect, it } from "vitest";
import {
  computeTrustScore,
  improvementTips,
  type TrustInput,
} from "@/lib/trust-score";

// Fixed "now" so month bucketing is deterministic: mid-July 2026.
const NOW = new Date(Date.UTC(2026, 6, 15));

function monthsAgoDate(months: number, day = 5): Date {
  return new Date(Date.UTC(2026, 6 - months, day));
}

function remittance(monthsAgo: number, amount = 5_000_000): TrustInput {
  return { type: "REMITTANCE", amount, date: monthsAgoDate(monthsAgo) };
}

function savings(monthsAgo: number, amount = 500_000): TrustInput {
  return { type: "SAVINGS", amount, date: monthsAgoDate(monthsAgo, 15) };
}

function income(monthsAgo: number, amount = 2_000_000): TrustInput {
  return { type: "INCOME", amount, date: monthsAgoDate(monthsAgo, 1) };
}

describe("computeTrustScore", () => {
  it("returns 0 and provisional for an empty ledger", () => {
    const result = computeTrustScore([], NOW);
    expect(result.score).toBe(0);
    expect(result.hasEnoughData).toBe(false);
    expect(result.windowMonths).toHaveLength(0);
  });

  it("gives full consistency for a transfer every month", () => {
    const txs = [0, 1, 2, 3, 4, 5].map((m) => remittance(m));
    const result = computeTrustScore(txs, NOW);
    expect(result.consistency.score).toBe(100);
    expect(result.consistency.details.activeMonths).toBe(6);
    expect(result.consistency.details.monthsConsidered).toBe(6);
  });

  it("penalizes skipped months proportionally", () => {
    // Active in 3 of the 6 months since the first transfer.
    const txs = [5, 3, 1].map((m) => remittance(m));
    const result = computeTrustScore(txs, NOW);
    expect(result.consistency.score).toBe(50);
  });

  it("does not punish a young household for months before it existed", () => {
    // First activity 2 months ago → window is 3 months, not 12.
    const txs = [2, 1, 0].map((m) => remittance(m));
    const result = computeTrustScore(txs, NOW);
    expect(result.consistency.details.monthsConsidered).toBe(3);
    expect(result.consistency.score).toBe(100);
    expect(result.hasEnoughData).toBe(true);
  });

  it("marks fewer than 3 months of history as provisional", () => {
    const result = computeTrustScore([remittance(1), remittance(0)], NOW);
    expect(result.hasEnoughData).toBe(false);
  });

  it("gives perfect stability for identical monthly amounts", () => {
    const txs = [0, 1, 2, 3].map((m) => remittance(m, 4_000_000));
    const result = computeTrustScore(txs, NOW);
    expect(result.stability.score).toBe(100);
    expect(result.stability.details.variationPercent).toBe(0);
  });

  it("scores volatile amounts lower than steady ones", () => {
    const steady = computeTrustScore(
      [0, 1, 2, 3].map((m) => remittance(m, 4_000_000)),
      NOW,
    );
    const volatile = computeTrustScore(
      [
        remittance(0, 8_000_000),
        remittance(1, 1_000_000),
        remittance(2, 6_000_000),
        remittance(3, 500_000),
      ],
      NOW,
    );
    expect(volatile.stability.score).toBeLessThan(steady.stability.score);
  });

  it("treats a single transfer as neutral stability, not perfect", () => {
    const result = computeTrustScore([remittance(0)], NOW);
    expect(result.stability.score).toBe(50);
  });

  it("caps the savings-rate bonus at 10% of income", () => {
    // Saving 50% of income shouldn't beat saving 10% on the rate part:
    // both should earn the full 30 points on top of regularity.
    const base = [0, 1, 2].map((m) => income(m, 1_000_000));
    const modest = computeTrustScore(
      [...base, ...[0, 1, 2].map((m) => savings(m, 100_000))],
      NOW,
    );
    const extreme = computeTrustScore(
      [...base, ...[0, 1, 2].map((m) => savings(m, 500_000))],
      NOW,
    );
    expect(modest.savings.score).toBe(100);
    expect(extreme.savings.score).toBe(100);
  });

  it("weights factors 40/30/30", () => {
    const txs = [0, 1, 2, 3].map((m) => remittance(m, 4_000_000));
    const result = computeTrustScore(txs, NOW);
    // consistency 100, stability 100, savings 0 → 40 + 30 + 0
    expect(result.score).toBe(70);
  });

  it("ignores transactions older than the 12-month window", () => {
    const recent = [0, 1, 2].map((m) => remittance(m));
    const withAncient = [...recent, remittance(14, 100)];
    expect(computeTrustScore(withAncient, NOW).score).toBe(
      computeTrustScore(recent, NOW).score,
    );
  });
});

describe("improvementTips", () => {
  it("tells a perfect household to maintain", () => {
    const txs = [
      ...[0, 1, 2, 3, 4, 5].map((m) => remittance(m, 4_000_000)),
      ...[0, 1, 2, 3, 4, 5].map((m) => savings(m, 450_000)),
    ];
    expect(improvementTips(computeTrustScore(txs, NOW))).toEqual(["maintain"]);
  });

  it("targets the lagging factors", () => {
    // Consistent + stable transfers, but no savings at all.
    const txs = [0, 1, 2, 3].map((m) => remittance(m, 4_000_000));
    const tips = improvementTips(computeTrustScore(txs, NOW));
    expect(tips).toContain("savings");
    expect(tips).not.toContain("consistency");
    expect(tips).not.toContain("stability");
  });

  it("tells new households to keep building history", () => {
    const tips = improvementTips(computeTrustScore([remittance(0)], NOW));
    expect(tips).toContain("keepGoing");
  });
});

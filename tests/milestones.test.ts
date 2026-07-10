import { describe, expect, it } from "vitest";
import { computeMilestones } from "@/lib/milestones";

function tx(type: string, year: number, month: number): { type: string; date: Date } {
  return { type, date: new Date(Date.UTC(year, month - 1, 10)) };
}

function byId(milestones: ReturnType<typeof computeMilestones>) {
  return Object.fromEntries(milestones.map((m) => [m.id, m.earned]));
}

describe("computeMilestones", () => {
  it("earns nothing on an empty ledger", () => {
    const m = byId(computeMilestones([], []));
    expect(Object.values(m).every((v) => v === false)).toBe(true);
  });

  it("earns firstTransfer from a single remittance", () => {
    const m = byId(computeMilestones([tx("REMITTANCE", 2026, 5)], []));
    expect(m.firstTransfer).toBe(true);
    expect(m.streak3).toBe(false);
  });

  it("counts consecutive-month streaks, not totals", () => {
    // 4 transfers but max run of 2 consecutive months → no streak3.
    const scattered = [
      tx("REMITTANCE", 2026, 1),
      tx("REMITTANCE", 2026, 2),
      tx("REMITTANCE", 2026, 4),
      tx("REMITTANCE", 2026, 6),
    ];
    expect(byId(computeMilestones(scattered, [])).streak3).toBe(false);

    const consecutive = [1, 2, 3].map((m) => tx("REMITTANCE", 2026, m));
    expect(byId(computeMilestones(consecutive, [])).streak3).toBe(true);
  });

  it("streaks span a year boundary", () => {
    const winter = [tx("REMITTANCE", 2025, 11), tx("REMITTANCE", 2025, 12), tx("REMITTANCE", 2026, 1)];
    expect(byId(computeMilestones(winter, [])).streak3).toBe(true);
  });

  it("earns streak6 only at six consecutive months", () => {
    const five = [1, 2, 3, 4, 5].map((m) => tx("REMITTANCE", 2026, m));
    expect(byId(computeMilestones(five, [])).streak6).toBe(false);
    const six = [...five, tx("REMITTANCE", 2026, 6)];
    expect(byId(computeMilestones(six, [])).streak6).toBe(true);
  });

  it("earns steadySaver from three consecutive savings months", () => {
    const saves = [3, 4, 5].map((m) => tx("SAVINGS", 2026, m));
    expect(byId(computeMilestones(saves, [])).steadySaver).toBe(true);
  });

  it("earns goalReached only when a goal is fully funded", () => {
    expect(
      byId(computeMilestones([], [{ currentAmount: 99, targetAmount: 100 }])).goalReached,
    ).toBe(false);
    expect(
      byId(computeMilestones([], [{ currentAmount: 100, targetAmount: 100 }])).goalReached,
    ).toBe(true);
    // A zero-target goal never counts.
    expect(
      byId(computeMilestones([], [{ currentAmount: 0, targetAmount: 0 }])).goalReached,
    ).toBe(false);
  });
});

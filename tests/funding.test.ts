import { describe, expect, it } from "vitest";
import { evaluateFunding } from "@/lib/funding";
import { type Minor } from "@/lib/money";

/** Values are UZS MINOR units (tiyin); `m` just brands the literals. */
const m = (n: number) => n as Minor;

describe("evaluateFunding", () => {
  it("allows a transfer the balance fully covers", () => {
    expect(evaluateFunding({ balance: m(500_000), cost: m(200_000) })).toEqual({ ok: true });
  });

  it("allows spending the balance down to exactly zero", () => {
    expect(evaluateFunding({ balance: m(200_000), cost: m(200_000) })).toEqual({ ok: true });
  });

  it("blocks a zero-balance card", () => {
    expect(evaluateFunding({ balance: m(0), cost: m(1) })).toEqual({
      ok: false,
      reason: "zero_balance",
    });
  });

  it("blocks sending more than the balance", () => {
    expect(evaluateFunding({ balance: m(199_999), cost: m(200_000) })).toEqual({
      ok: false,
      reason: "insufficient_funds",
    });
  });

  it("blocks when no funding card is selected", () => {
    expect(evaluateFunding({ balance: null, cost: m(200_000) })).toEqual({
      ok: false,
      reason: "no_card",
    });
    expect(evaluateFunding({ balance: undefined, cost: m(200_000) })).toEqual({
      ok: false,
      reason: "no_card",
    });
  });

  it("rejects non-positive and non-finite amounts", () => {
    for (const cost of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(evaluateFunding({ balance: m(500_000), cost: cost as Minor })).toEqual({
        ok: false,
        reason: "invalid_amount",
      });
    }
  });

  // A negative balance should never exist (DB CHECK), but if one ever did the
  // rules must still refuse to move money out of it.
  it("blocks a negative balance", () => {
    expect(evaluateFunding({ balance: m(-1), cost: m(1) })).toEqual({
      ok: false,
      reason: "zero_balance",
    });
  });
});

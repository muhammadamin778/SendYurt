import { describe, expect, it } from "vitest";
import { evaluateFunding } from "@/lib/funding";

describe("evaluateFunding", () => {
  it("allows a transfer the balance fully covers", () => {
    expect(evaluateFunding({ balance: 500_000, cost: 200_000 })).toEqual({ ok: true });
  });

  it("allows spending the balance down to exactly zero", () => {
    expect(evaluateFunding({ balance: 200_000, cost: 200_000 })).toEqual({ ok: true });
  });

  it("blocks a zero-balance card", () => {
    expect(evaluateFunding({ balance: 0, cost: 1 })).toEqual({
      ok: false,
      reason: "zero_balance",
    });
  });

  it("blocks sending more than the balance", () => {
    expect(evaluateFunding({ balance: 199_999, cost: 200_000 })).toEqual({
      ok: false,
      reason: "insufficient_funds",
    });
  });

  it("blocks when no funding card is selected", () => {
    expect(evaluateFunding({ balance: null, cost: 200_000 })).toEqual({
      ok: false,
      reason: "no_card",
    });
    expect(evaluateFunding({ balance: undefined, cost: 200_000 })).toEqual({
      ok: false,
      reason: "no_card",
    });
  });

  it("rejects non-positive and non-finite amounts", () => {
    for (const cost of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(evaluateFunding({ balance: 500_000, cost })).toEqual({
        ok: false,
        reason: "invalid_amount",
      });
    }
  });

  // A negative balance should never exist (DB CHECK), but if one ever did the
  // rules must still refuse to move money out of it.
  it("blocks a negative balance", () => {
    expect(evaluateFunding({ balance: -1, cost: 1 })).toEqual({
      ok: false,
      reason: "zero_balance",
    });
  });
});

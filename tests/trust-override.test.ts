import { describe, expect, it } from "vitest";
import {
  MAX_OVERRIDE_DELTA,
  OVERRIDE_REASON_CODES,
  effectiveScore,
  isValidDelta,
  isValidOverrideReasonCode,
} from "@/lib/trust-override";

/**
 * The rules that keep an override a *correction* rather than a way to set the
 * score outright — and that keep an adjusted score distinguishable from an
 * earned one.
 *
 * Pure, so this is the whole contract: the server action and the operator's
 * preview both call these functions, which is what guarantees the number an
 * operator sees before submitting is the number that gets recorded.
 */

describe("effectiveScore", () => {
  it("keeps the base and the delta visible alongside the result", () => {
    // The point of the whole design: 61 earned, +7 granted, 68 shown — all
    // three recoverable, rather than a bare 68 nobody can explain.
    expect(effectiveScore(61, 7)).toEqual({ base: 61, delta: 7, effective: 68, clamped: false });
  });

  it("treats a missing delta as no adjustment", () => {
    expect(effectiveScore(61)).toEqual({ base: 61, delta: 0, effective: 61, clamped: false });
  });

  it("applies negative adjustments", () => {
    expect(effectiveScore(61, -11).effective).toBe(50);
  });

  it("clamps to 0-100 and says when the clamp bit", () => {
    const high = effectiveScore(95, 10);
    expect(high.effective).toBe(100);
    // Flagged, so the UI can explain that +10 only moved the score by 5
    // instead of silently showing arithmetic that doesn't add up.
    expect(high.clamped).toBe(true);

    const low = effectiveScore(4, -12);
    expect(low.effective).toBe(0);
    expect(low.clamped).toBe(true);
  });

  it("does not report a clamp when the sum lands exactly on a bound", () => {
    expect(effectiveScore(90, 10)).toMatchObject({ effective: 100, clamped: false });
    expect(effectiveScore(10, -10)).toMatchObject({ effective: 0, clamped: false });
  });

  it("never mutates the base — the stored delta is the original intent", () => {
    // A -20 against a base of 10 clamps to 0 today, but if the base later
    // rises to 60 the full -20 is what should apply. Clamping on read, not on
    // write, is what preserves that.
    expect(effectiveScore(10, -20).effective).toBe(0);
    expect(effectiveScore(60, -20).effective).toBe(40);
  });
});

describe("isValidDelta", () => {
  it("refuses zero — it changes nothing, so it is a mistake or a misplaced note", () => {
    expect(isValidDelta(0)).toBe(false);
  });

  it("refuses anything past the cap in either direction", () => {
    // Without a cap an operator could type 100 and the computation stops
    // mattering, which is the outcome this design exists to prevent.
    expect(isValidDelta(MAX_OVERRIDE_DELTA)).toBe(true);
    expect(isValidDelta(-MAX_OVERRIDE_DELTA)).toBe(true);
    expect(isValidDelta(MAX_OVERRIDE_DELTA + 1)).toBe(false);
    expect(isValidDelta(-MAX_OVERRIDE_DELTA - 1)).toBe(false);
    expect(isValidDelta(100)).toBe(false);
  });

  it("refuses fractions and non-numbers", () => {
    expect(isValidDelta(2.5)).toBe(false);
    expect(isValidDelta(NaN)).toBe(false);
    expect(isValidDelta(Infinity)).toBe(false);
  });
});

describe("isValidOverrideReasonCode", () => {
  it("accepts every published code", () => {
    for (const code of OVERRIDE_REASON_CODES) {
      expect(isValidOverrideReasonCode(code)).toBe(true);
    }
  });

  it("refuses a code borrowed from the transaction reason codes", () => {
    // REVERSE codes justify moving money, not adjusting a score. Sharing the
    // namespace would make "show me every FRAUD override" ambiguous.
    expect(isValidOverrideReasonCode("DUPLICATE")).toBe(false);
    expect(isValidOverrideReasonCode("ENTERED_IN_ERROR")).toBe(false);
    expect(isValidOverrideReasonCode("")).toBe(false);
  });

  it("has no duplicates", () => {
    expect(new Set(OVERRIDE_REASON_CODES).size).toBe(OVERRIDE_REASON_CODES.length);
  });
});

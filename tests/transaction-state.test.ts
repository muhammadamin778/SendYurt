import { describe, expect, it } from "vitest";
import { isValidReasonCode, reasonCodesFor, REASON_CODES } from "@/lib/reason-codes";
import {
  availableEvents,
  canTransition,
  countsTowardBalances,
  isTerminal,
  transition,
  TRANSACTION_EVENTS,
  TRANSACTION_STATES,
  type TransactionEventName,
  type TransactionState,
} from "@/lib/transaction-state";

/** Every legal move, spelled out — the table is the contract. */
const LEGAL: Array<[TransactionState, TransactionEventName, TransactionState]> = [
  ["PENDING", "CONFIRM", "COMPLETED"],
  ["PENDING", "FAIL", "FAILED"],
  ["COMPLETED", "DISPUTE", "DISPUTED"],
  ["COMPLETED", "REVERSE", "REVERSED"],
  ["DISPUTED", "RESOLVE_VALID", "COMPLETED"],
  ["DISPUTED", "RESOLVE_UPHELD", "REVERSED"],
];

describe("transition", () => {
  it.each(LEGAL)("allows %s --%s--> %s", (from, event, to) => {
    expect(transition(from, event)).toEqual({ ok: true, to });
  });

  it("rejects every combination that is not in the table", () => {
    const legal = new Set(LEGAL.map(([from, event]) => `${from}:${event}`));
    for (const from of TRANSACTION_STATES) {
      for (const event of TRANSACTION_EVENTS) {
        if (legal.has(`${from}:${event}`)) continue;
        expect(transition(from, event)).toEqual({
          ok: false,
          reason: "illegal_transition",
        });
      }
    }
  });

  it("cannot confirm something already completed, or dispute something pending", () => {
    // The two guards the whole design exists to enforce.
    expect(canTransition("COMPLETED", "CONFIRM")).toBe(false);
    expect(canTransition("PENDING", "DISPUTE")).toBe(false);
  });

  it("reports unknown states and events rather than assuming", () => {
    // `status` is a free String column, so junk can reach this function.
    expect(transition("GARBAGE", "CONFIRM")).toEqual({ ok: false, reason: "unknown_state" });
    expect(transition("PENDING", "EXPLODE")).toEqual({ ok: false, reason: "unknown_event" });
  });
});

describe("terminal states", () => {
  it("treats FAILED and REVERSED as terminal", () => {
    expect(isTerminal("FAILED")).toBe(true);
    expect(isTerminal("REVERSED")).toBe(true);
  });

  it("leaves the working states non-terminal", () => {
    for (const s of ["PENDING", "COMPLETED", "DISPUTED"]) {
      expect(isTerminal(s)).toBe(false);
    }
  });

  it("offers no event out of a terminal state", () => {
    expect(availableEvents("FAILED")).toEqual([]);
    expect(availableEvents("REVERSED")).toEqual([]);
  });

  it("a reversed transaction can never be revived", () => {
    for (const event of TRANSACTION_EVENTS) {
      expect(canTransition("REVERSED", event)).toBe(false);
    }
  });
});

describe("availableEvents", () => {
  it("drives which controls render, per state", () => {
    expect(availableEvents("PENDING").sort()).toEqual(["CONFIRM", "FAIL"]);
    expect(availableEvents("COMPLETED").sort()).toEqual(["DISPUTE", "REVERSE"]);
    expect(availableEvents("DISPUTED").sort()).toEqual(["RESOLVE_UPHELD", "RESOLVE_VALID"]);
  });

  it("returns nothing for an unrecognised state", () => {
    expect(availableEvents("GARBAGE")).toEqual([]);
  });
});

describe("countsTowardBalances", () => {
  it("counts only COMPLETED", () => {
    expect(countsTowardBalances("COMPLETED")).toBe(true);
    // A reversed row must never reach a total or a Trust Score.
    for (const s of ["PENDING", "FAILED", "DISPUTED", "REVERSED"]) {
      expect(countsTowardBalances(s)).toBe(false);
    }
  });
});

describe("reason codes", () => {
  it("covers every event", () => {
    for (const event of TRANSACTION_EVENTS) {
      expect(reasonCodesFor(event).length).toBeGreaterThan(0);
    }
  });

  it("accepts a code only for the event it belongs to", () => {
    expect(isValidReasonCode("REVERSE", "DUPLICATE")).toBe(true);
    // A dispute code filed under a reversal must be refused.
    expect(isValidReasonCode("REVERSE", "NOT_RECEIVED")).toBe(false);
    expect(isValidReasonCode("DISPUTE", "NOT_RECEIVED")).toBe(true);
    expect(isValidReasonCode("DISPUTE", "DUPLICATE")).toBe(false);
  });

  it("rejects unknown codes", () => {
    expect(isValidReasonCode("REVERSE", "")).toBe(false);
    expect(isValidReasonCode("REVERSE", "WHATEVER")).toBe(false);
  });

  it("always offers an OTHER escape hatch so an operator is never stuck", () => {
    for (const event of TRANSACTION_EVENTS) {
      expect(REASON_CODES[event]).toContain("OTHER");
    }
  });
});

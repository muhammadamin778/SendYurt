/**
 * Trust Score overrides — the rules, with no I/O.
 *
 * The score decides what a household is offered, so it has to be disputable.
 * But a corrected score that looks identical to a computed one is not
 * auditable: nobody can tell afterwards which numbers were earned and which
 * were granted. So an override is never a new score. It is a signed `delta`
 * recorded against the household, applied on read, with the computed base
 * still visible beside it.
 *
 * Pure and dependency-free, in the same shape as `src/lib/transaction-state.ts`
 * and `src/lib/permissions.ts`: one table plus the functions that read it,
 * exhaustively unit-tested, shared by the server action and the UI.
 */

/**
 * Why an adjustment was made. Filterable, unlike prose: "show me every
 * override filed as DISPUTE_UPHELD this quarter" is a query, and a quarter of
 * free text is not.
 */
export const OVERRIDE_REASON_CODES = [
  /** A dispute was resolved in the customer's favour. */
  "DISPUTE_UPHELD",
  /** The ledger under-represents them — cash sent outside the app, say. */
  "UNRECORDED_HISTORY",
  /** A defect in our data or scoring produced a number we can't stand behind. */
  "DATA_CORRECTION",
  /** Documented, deliberate discretion. Distinct from the codes above. */
  "GOODWILL",
  /** Confirmed abuse; the computed score overstates them. */
  "FRAUD_ADJUSTMENT",
  "OTHER",
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASON_CODES)[number];

/**
 * The widest adjustment a single override may carry, in either direction.
 *
 * A cap is the difference between "correct the score" and "set the score".
 * Without one an operator could type 100 and the computation stops mattering,
 * which is the outcome this whole design exists to prevent. Fifteen points
 * moves a household a full band without erasing what the ledger says.
 */
export const MAX_OVERRIDE_DELTA = 15;

/** Shortest justification accepted. Long enough to have said something. */
export const MIN_OVERRIDE_REASON_LENGTH = 10;

export function isValidOverrideReasonCode(code: string): code is OverrideReasonCode {
  return (OVERRIDE_REASON_CODES as readonly string[]).includes(code);
}

/**
 * Whether a delta may be recorded.
 *
 * Zero is refused: it changes nothing, so it is either a mistake or an attempt
 * to file a note in the wrong place. Notes belong on the audit entry.
 */
export function isValidDelta(delta: number): boolean {
  return Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_OVERRIDE_DELTA;
}

export interface EffectiveScore {
  /** Recomputed from the ledger. Never written to by an override. */
  base: number;
  /** The active adjustment, 0 when there is none. */
  delta: number;
  /** What the customer and staff both see: `base + delta`, clamped to 0-100. */
  effective: number;
  /**
   * True when the clamp actually bit — i.e. `base + delta` fell outside 0-100
   * and the effective score is not literally the sum. Surfaced so the UI can
   * say so rather than silently showing arithmetic that doesn't add up.
   */
  clamped: boolean;
}

/**
 * Combine a computed score with an adjustment.
 *
 * Clamping happens here, on read, and never at write time. Storing a
 * pre-clamped delta would lose information: a -20 against a base of 10 is a
 * different fact from a -10, and if the base later rises to 60 the original
 * intent is the one that should apply.
 */
export function effectiveScore(base: number, delta: number = 0): EffectiveScore {
  const sum = base + delta;
  const effective = Math.max(0, Math.min(100, sum));
  return { base, delta, effective, clamped: effective !== sum };
}

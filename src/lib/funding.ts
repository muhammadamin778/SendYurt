/**
 * Core banking rules for funding an outgoing transfer.
 *
 * Kept as a pure function so the same decision drives BOTH the client (to
 * disable the Confirm button and explain why) and the server action (which is
 * authoritative). No money may leave an account unless this returns `ok`.
 *
 * The rules, in order:
 *   1. A transfer must have a funding source — no card, no transfer.
 *   2. The amount must be a positive, finite number.
 *   3. A card with a zero balance can never fund a transfer.
 *   4. The balance must cover the full amount — no overdraft, no partial send.
 *
 * Defence in depth: this check → the conditional `updateMany` debit (which
 * only decrements when the balance still covers the cost, closing the
 * race between two concurrent transfers) → the `Card_balance_nonneg` DB CHECK.
 */

export type FundingDecision =
  | { ok: true }
  | { ok: false; reason: "no_card" | "invalid_amount" | "zero_balance" | "insufficient_funds" };

export interface FundingInput {
  /** Balance of the chosen card in UZS, or null/undefined when none is chosen. */
  balance?: number | null;
  /** UZS the card must cover for this transfer. */
  cost: number;
}

export function evaluateFunding({ balance, cost }: FundingInput): FundingDecision {
  // 1. A funding source is mandatory.
  if (balance == null || !Number.isFinite(balance)) {
    return { ok: false, reason: "no_card" };
  }
  // 2. Reject non-positive / non-finite amounts before any comparison.
  if (!Number.isFinite(cost) || cost <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  // 3. An empty card is called out separately so the UI can say "top up"
  //    rather than the vaguer "not enough funds".
  if (balance <= 0) {
    return { ok: false, reason: "zero_balance" };
  }
  // 4. No overdraft.
  if (balance < cost) {
    return { ok: false, reason: "insufficient_funds" };
  }
  return { ok: true };
}

/**
 * Reason codes for manual interventions.
 *
 * Every operator-initiated state change must carry one. A free-text note alone
 * is not enough: six months later an audit log full of prose can't be filtered,
 * counted, or reported on, whereas "show me every REVERSE with reason FRAUD"
 * is a query. The optional note carries the specifics on top.
 *
 * Codes are grouped by the event they justify so the UI can offer only the
 * relevant ones, and the server can reject a code that doesn't belong to the
 * event being performed.
 */

import type { TransactionEventName } from "@/lib/transaction-state";

export const REASON_CODES = {
  CONFIRM: ["PROVIDER_CONFIRMED", "MANUAL_VERIFICATION", "OTHER"],
  FAIL: ["PROVIDER_REJECTED", "TIMEOUT", "INVALID_DETAILS", "OTHER"],
  DISPUTE: ["NOT_RECEIVED", "WRONG_AMOUNT", "UNAUTHORIZED", "OTHER"],
  RESOLVE_VALID: ["EVIDENCE_PROVIDED", "CUSTOMER_WITHDREW", "OTHER"],
  RESOLVE_UPHELD: ["PROVIDER_CONFIRMED_LOSS", "FRAUD", "OTHER"],
  REVERSE: [
    "DUPLICATE",
    "ENTERED_IN_ERROR",
    "FRAUD",
    "PROVIDER_FAILED",
    "CUSTOMER_REQUEST",
    "OTHER",
  ],
} as const satisfies Record<TransactionEventName, readonly string[]>;

export type ReasonCode = (typeof REASON_CODES)[TransactionEventName][number];

/** The codes an operator may pick for this event. */
export function reasonCodesFor(event: TransactionEventName): readonly string[] {
  return REASON_CODES[event];
}

/**
 * Server-side guard: a code is only valid for the event it belongs to, so a
 * crafted request can't file a reversal under a dispute code.
 */
export function isValidReasonCode(event: TransactionEventName, code: string): boolean {
  return (REASON_CODES[event] as readonly string[]).includes(code);
}

/**
 * Recorded on creation, where there is no operator and nothing to justify.
 * Kept distinct from the manual codes so the two are never confused in a report.
 */
export const SYSTEM_REASON_CREATED = "CREATED";

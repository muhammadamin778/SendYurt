/**
 * A transaction is a state machine, not a row.
 *
 * Every change of state is a named event, and the events available at any
 * moment are a function of the current state — you can only confirm something
 * pending, only dispute something completed. Modelling that here, as a pure
 * table, means the same rules gate the server action AND decide which buttons
 * an operator sees, so the UI can never offer an action the server will refuse.
 *
 * Pure and dependency-free (same shape as `src/lib/funding.ts`) so it is
 * exhaustively unit-testable without a database.
 *
 * The three original strings — PENDING / COMPLETED / FAILED — are kept verbatim.
 * That is deliberate: every read path that filters `status: "COMPLETED"` keeps
 * working untouched, and a reversed row drops out of those totals automatically.
 */

export const TRANSACTION_STATES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "DISPUTED",
  "REVERSED",
] as const;

export type TransactionState = (typeof TRANSACTION_STATES)[number];

export const TRANSACTION_EVENTS = [
  "CONFIRM",
  "FAIL",
  "DISPUTE",
  "RESOLVE_VALID",
  "RESOLVE_UPHELD",
  "REVERSE",
] as const;

export type TransactionEventName = (typeof TRANSACTION_EVENTS)[number];

/**
 * The transition table. An event missing from a state's map is illegal from
 * that state — there is no implicit fallthrough.
 *
 *   PENDING   --CONFIRM-->        COMPLETED
 *   PENDING   --FAIL-->           FAILED
 *   COMPLETED --DISPUTE-->        DISPUTED
 *   COMPLETED --REVERSE-->        REVERSED
 *   DISPUTED  --RESOLVE_VALID-->  COMPLETED   (dispute rejected, record stands)
 *   DISPUTED  --RESOLVE_UPHELD--> REVERSED    (dispute upheld, record undone)
 *   FAILED, REVERSED              terminal
 */
const TRANSITIONS: Record<TransactionState, Partial<Record<TransactionEventName, TransactionState>>> = {
  PENDING: {
    CONFIRM: "COMPLETED",
    FAIL: "FAILED",
  },
  COMPLETED: {
    DISPUTE: "DISPUTED",
    REVERSE: "REVERSED",
  },
  DISPUTED: {
    RESOLVE_VALID: "COMPLETED",
    RESOLVE_UPHELD: "REVERSED",
  },
  FAILED: {},
  REVERSED: {},
};

export type TransitionResult =
  | { ok: true; to: TransactionState }
  | { ok: false; reason: "unknown_state" | "unknown_event" | "illegal_transition" };

export function isTransactionState(value: string): value is TransactionState {
  return (TRANSACTION_STATES as readonly string[]).includes(value);
}

export function isTransactionEvent(value: string): value is TransactionEventName {
  return (TRANSACTION_EVENTS as readonly string[]).includes(value);
}

/**
 * Resolve `from --event-> to`, or explain why it isn't allowed.
 *
 * Takes plain strings because `Transaction.status` is a free String column;
 * an unrecognised value is reported rather than assumed.
 */
export function transition(from: string, event: string): TransitionResult {
  if (!isTransactionState(from)) return { ok: false, reason: "unknown_state" };
  if (!isTransactionEvent(event)) return { ok: false, reason: "unknown_event" };
  const to = TRANSITIONS[from][event];
  if (!to) return { ok: false, reason: "illegal_transition" };
  return { ok: true, to };
}

/** Every event legal from this state — drives which controls are rendered. */
export function availableEvents(from: string): TransactionEventName[] {
  if (!isTransactionState(from)) return [];
  return Object.keys(TRANSITIONS[from]) as TransactionEventName[];
}

export function canTransition(from: string, event: string): boolean {
  return transition(from, event).ok;
}

/** No event can move a terminal state anywhere. */
export function isTerminal(state: string): boolean {
  return isTransactionState(state) && availableEvents(state).length === 0;
}

/**
 * A reversed transaction must not count toward any balance or score. Kept as a
 * named predicate so the intent is greppable at call sites rather than an
 * inline string comparison.
 */
export function countsTowardBalances(state: string): boolean {
  return state === "COMPLETED";
}

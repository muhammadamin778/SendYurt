/**
 * Support ticket lifecycle — the rules, with no I/O.
 *
 * Same shape as `src/lib/transaction-state.ts`: one transition table, read by
 * both the server actions and the console UI, so a control is only offered
 * when the move is actually legal. The UI reading the same table is what stops
 * "the button was enabled but the server said no".
 */

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ["Compliance", "Payments", "Account", "Technical"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/**
 * What an operator can do to a ticket. Named for the button, so the mapping
 * from screen to rule is one hop.
 */
export const TICKET_EVENTS = ["ASSIGN", "REQUEST_KYC", "REPLY", "RESOLVE", "REOPEN"] as const;
export type TicketEvent = (typeof TICKET_EVENTS)[number];

/**
 * Legal transitions.
 *
 * Note what is deliberately absent: RESOLVED has no ASSIGN, REQUEST_KYC or
 * REPLY. A closed ticket has to be reopened first, so the thread can never
 * grow after the point it was declared finished — otherwise "resolved at
 * 14:02" stops meaning anything.
 */
const TRANSITIONS: Record<TicketStatus, Partial<Record<TicketEvent, TicketStatus>>> = {
  OPEN: {
    ASSIGN: "IN_PROGRESS",
    REQUEST_KYC: "IN_PROGRESS",
    REPLY: "IN_PROGRESS",
    RESOLVE: "RESOLVED",
  },
  IN_PROGRESS: {
    // Reassignment and further replies are normal work — they keep the state.
    ASSIGN: "IN_PROGRESS",
    REQUEST_KYC: "IN_PROGRESS",
    REPLY: "IN_PROGRESS",
    RESOLVE: "RESOLVED",
  },
  RESOLVED: {
    REOPEN: "OPEN",
  },
};

/** The status this event produces, or null when the move is not legal. */
export function nextTicketStatus(status: TicketStatus, event: TicketEvent): TicketStatus | null {
  return TRANSITIONS[status]?.[event] ?? null;
}

export function canTicketTransition(status: TicketStatus, event: TicketEvent): boolean {
  return nextTicketStatus(status, event) !== null;
}

/** Every event legal from here — drives which controls the console enables. */
export function allowedTicketEvents(status: TicketStatus): TicketEvent[] {
  return TICKET_EVENTS.filter((e) => canTicketTransition(status, e));
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

/**
 * The permission each event requires.
 *
 * Kept here, beside the transition table, rather than inline in the actions:
 * "who may do what to a ticket" and "what may follow what" are read together,
 * and splitting them is how the two drift apart.
 */
export const TICKET_EVENT_PERMISSION = {
  ASSIGN: "ticket.assign",
  REQUEST_KYC: "ticket.reply",
  REPLY: "ticket.reply",
  RESOLVE: "ticket.resolve",
  REOPEN: "ticket.resolve",
} as const satisfies Record<TicketEvent, string>;

/** `SUP-0001` — stable width so the console's list column doesn't jitter. */
export function ticketReference(sequence: number): string {
  return `SUP-${String(sequence).padStart(4, "0")}`;
}

/**
 * Spreading the ticket queue across the people on shift.
 *
 * Pure and dependency-free, like `ticket-state.ts` beside it: the console
 * previews the split before applying it, and the server action applies it,
 * both from these functions. That shared source is what makes the preview
 * trustworthy rather than decorative.
 *
 * The rule, stated once: with `total` tickets and `staffCount` people,
 * everyone gets `floor(total / staffCount)`, and the first `total %
 * staffCount` people take one extra. 23 across 5 is 5, 5, 5, 4, 4 — never
 * 5, 5, 5, 5, 3, which is the split a naive chunker produces and which puts a
 * whole extra ticket of work on one person for no reason.
 */

/**
 * How many tickets each person should hold, largest shares first.
 *
 * Returns one entry per staff member, so `shape.length === staffCount` and
 * `sum(shape) === total`. Both are asserted in the tests, because an
 * off-by-one here silently drops a ticket on the floor.
 */
export function distributionShape(total: number, staffCount: number): number[] {
  if (staffCount <= 0 || total < 0) return [];

  const base = Math.floor(total / staffCount);
  const remainder = total % staffCount;
  return Array.from({ length: staffCount }, (_, i) => (i < remainder ? base + 1 : base));
}

export interface Assignment {
  ticketId: string;
  staffId: string;
}

/**
 * Turn the shape into concrete ticket → person pairs.
 *
 * Both inputs are consumed in the order given, and callers are expected to
 * pass a stable order (tickets oldest-first, staff by id). Determinism matters
 * more than it looks: an operator who previews a split, thinks about it, and
 * then applies it must get the split they were shown.
 *
 * The extra ticket goes to whoever is earliest in `staffIds`. That is
 * arbitrary but consistent — and since the caller sorts staff by current load
 * first, "earliest" in practice means "least busy".
 */
export function planAssignments(ticketIds: string[], staffIds: string[]): Assignment[] {
  if (staffIds.length === 0) return [];

  const shape = distributionShape(ticketIds.length, staffIds.length);
  const assignments: Assignment[] = [];

  let cursor = 0;
  shape.forEach((count, i) => {
    for (let n = 0; n < count; n++) {
      assignments.push({ ticketId: ticketIds[cursor], staffId: staffIds[i] });
      cursor++;
    }
  });

  return assignments;
}

export interface StaffLoad {
  staffId: string;
  /** Unresolved tickets currently on this person's desk. */
  open: number;
}

/**
 * Order people least-busy first, so a rebalance hands the surplus to whoever
 * has room rather than to whoever happens to sort first alphabetically.
 *
 * Ties break on `staffId` to keep the whole thing deterministic.
 */
export function byLightestLoad(loads: StaffLoad[]): string[] {
  return [...loads]
    .sort((a, b) => a.open - b.open || a.staffId.localeCompare(b.staffId))
    .map((l) => l.staffId);
}

/**
 * The person a single new ticket should go to — the lightest desk.
 *
 * Used when a ticket arrives, so the queue stays level continuously instead of
 * drifting until someone remembers to rebalance. Null when nobody is on shift,
 * which leaves the ticket unassigned rather than inventing an owner.
 */
export function nextAssignee(loads: StaffLoad[]): string | null {
  return byLightestLoad(loads)[0] ?? null;
}

/** How lopsided the queue is right now — 0 when it is level. */
export function loadSpread(loads: StaffLoad[]): number {
  if (loads.length === 0) return 0;
  const counts = loads.map((l) => l.open);
  return Math.max(...counts) - Math.min(...counts);
}

/**
 * Routing rule for the admin topbar search.
 *
 * One box serves two destinations: a transaction id goes to the transaction
 * monitor, anything else searches customers by name or email. Kept here as
 * pure logic — like `transaction-state.ts` and `permissions.ts` — so the rule
 * is unit-testable without rendering a component.
 */

/**
 * Does this query name a transaction rather than a person?
 *
 * Only two shapes qualify: a full cuid (Prisma's default id — `c` plus ~24
 * chars), or the short form the transactions table displays, which an operator
 * copies WITH its `#` prefix or `-UZ` suffix.
 *
 * A bare 8-character token deliberately does NOT qualify. It used to, and that
 * silently broke customer search: plenty of Uzbek names are exactly eight
 * letters — muhammad, abdullah, jasurbek, gaybullo, shomurod — so looking a
 * customer up sent the operator to the transaction monitor and returned
 * nothing. Names are the common case; an id search can afford to be explicit.
 */
export function looksLikeTransactionId(q: string): boolean {
  const trimmed = q.trim();
  // A full cuid is unambiguous on its own.
  if (/^c[a-z0-9]{20,}$/i.test(trimmed)) return true;
  // Otherwise the operator must have kept the marker the table renders.
  const marked = trimmed.startsWith("#") || /-uz$/i.test(trimmed);
  if (!marked) return false;
  const bare = trimmed.replace(/^#/, "").replace(/-uz$/i, "");
  return /^[a-z0-9]{8,}$/i.test(bare);
}

/** Strip the display markers so the value can be matched against a stored id. */
export function normalizeTransactionQuery(q: string): string {
  return q.trim().replace(/^#/, "").replace(/-uz$/i, "").toLowerCase();
}

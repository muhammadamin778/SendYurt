import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { BridgedUser } from "@/lib/supabase/bridge";

/**
 * "View as user" — letting an operator see a customer's screens exactly as the
 * customer sees them, to answer "it says my balance is wrong" without a
 * screenshot exchange.
 *
 * Three properties make this safe, and each is enforced here rather than by
 * convention at call sites:
 *
 * 1. **No credential is minted.** The cookie holds a row id, not a token. The
 *    operator's own Supabase session is untouched and still resolves to *them*.
 *    Every request re-reads the row and checks that the currently
 *    authenticated operator is the one the grant was issued to — so a stolen
 *    cookie is worthless to anyone else, and revoking the row (or the
 *    operator's staff role) takes effect on the very next request.
 * 2. **It expires.** `expiresAt` is a hard stop, checked server-side. A
 *    forgotten tab stops working on its own.
 * 3. **It is read-only.** Enforced at the session chokepoint, not per action —
 *    see `getAppSession()`, which throws while a view-as session is active.
 *
 * This module deliberately does not import the session module: `app-session.ts`
 * imports *this* one, and the dependency has to run in a single direction. The
 * operator's id is therefore passed in.
 */

/** Holds only an `ImpersonationSession.id`. See the note above on why that is enough. */
export const IMPERSONATION_COOKIE = "sy_view_as";

/**
 * How long a grant lasts. Short on purpose: long enough to work a ticket,
 * short enough that walking away from the desk closes it.
 */
export const IMPERSONATION_TTL_MINUTES = 30;

/** Thrown by the session chokepoint when something tries to write. */
export const READ_ONLY_ERROR = "read_only_session";

export interface ActiveImpersonation {
  sessionId: string;
  reason: string;
  startedAt: Date;
  expiresAt: Date;
  operatorId: string;
  /** The customer whose screens are being rendered. */
  target: BridgedUser;
}

/**
 * Resolve the view-as session for this request, or `null`.
 *
 * Returns null — never throws — for every failure mode (no cookie, unknown id,
 * ended, expired, bound to a different operator, target suspended). A bad
 * cookie must degrade to "you are yourself", not to an error page.
 *
 * Cached per request: the layout, the page and the session guard all ask.
 */
export const getActiveImpersonation = cache(
  async (operatorId: string): Promise<ActiveImpersonation | null> => {
    const sessionId = readCookie();
    if (!sessionId) return null;

    const row = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      include: { target: true },
    });
    if (!row) return null;

    // The grant belongs to one operator. Presenting someone else's cookie
    // resolves to nothing rather than to their session.
    if (row.operatorId !== operatorId) return null;
    if (row.endedAt) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    // A customer suspended mid-session stops being viewable, matching
    // `getAppSession`'s rule for their own login.
    if (row.target.suspended) return null;

    return {
      sessionId: row.id,
      reason: row.reason,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      operatorId: row.operatorId,
      target: row.target,
    };
  },
);

/**
 * The cookie, or null outside a request scope.
 *
 * `cookies()` throws when there is no request (a background job, a unit test).
 * Swallowing that is correct here: "no request" genuinely means "nobody is
 * impersonating", and it must not be able to fail an otherwise valid call.
 */
function readCookie(): string | null {
  try {
    return cookies().get(IMPERSONATION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * True when this request is rendering someone else's account, for suppressing
 * writes that happen as a side effect of *reading* — `getTrustData()` persists
 * a score snapshot and can notify the household, which an operator looking at
 * a screen must not trigger.
 *
 * Deliberately weaker than `getActiveImpersonation`: it does not check that
 * the cookie belongs to the caller, because it has no caller to check against.
 * That asymmetry is safe in this direction only. The worst a forged or stale
 * cookie can do here is *suppress* a snapshot — a read stays a read. It must
 * never be used to decide whose data to show.
 */
export const isReadOnlyRequest = cache(async (): Promise<boolean> => {
  const sessionId = readCookie();
  if (!sessionId) return false;

  const row = await prisma.impersonationSession.findUnique({
    where: { id: sessionId },
    select: { endedAt: true, expiresAt: true },
  });
  if (!row) return false;
  return !row.endedAt && row.expiresAt.getTime() > Date.now();
});

/** Minutes remaining, floored at 0 — for the countdown in the banner. */
export function minutesLeft(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000));
}

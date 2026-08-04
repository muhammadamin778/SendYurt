/**
 * Time formatting for the view-as banner.
 *
 * Separate from `impersonation.ts` on purpose: that module imports
 * `next/headers` and Prisma, so anything reaching into it is server-only. The
 * banner is a Client Component and needs these two functions, so they live
 * here with no imports at all. Sharing a file with the cookie reader would
 * fail the build — and did.
 */

/**
 * Seconds → `m:ss`.
 *
 * Seconds are padded so the width never jumps mid-session, and ninety seconds
 * reads as "1:30" rather than "1 min": the point of a countdown is watching it
 * move, and whole-minute rounding leaves it frozen for a minute at a time.
 *
 * Floors at zero. Clocks drift and a backgrounded tab can wake up late, so the
 * banner must never be able to read "-0:07".
 */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Whole minutes remaining, floored at 0 — the server's first-paint figure. */
export function minutesLeft(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000));
}

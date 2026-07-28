import "server-only";
import Stripe from "stripe";

/**
 * Server-side Stripe client + platform-commission helpers.
 *
 * SECURITY: the `server-only` import makes the build fail if this module is
 * ever pulled into a Client Component, so the secret key can never reach the
 * browser. The client only ever sees NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 *
 * All amounts are in the currency's smallest unit (e.g. cents for USD) —
 * Stripe's convention.
 */

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!cached) {
    // No apiVersion pinned here on purpose — the SDK uses your account's
    // default, which avoids a version/typing mismatch across upgrades.
    cached = new Stripe(key);
  }
  return cached;
}

/** True when the integration is configured (so callers can degrade gracefully). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Platform commission in basis points (250 = 2.5%). Configurable via
 * STRIPE_PLATFORM_FEE_BPS; defaults to 2.5%.
 */
export const PLATFORM_FEE_BPS = (() => {
  const raw = Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "250");
  return Number.isFinite(raw) && raw >= 0 && raw <= 10_000 ? Math.round(raw) : 250;
})();

/** The platform's cut of a charge, in the same minor units as `amount`. */
export function computePlatformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_BPS) / 10_000);
}

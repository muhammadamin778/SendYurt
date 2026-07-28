"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Memoized Stripe.js loader for the browser. Reads the publishable key
 * (safe to expose). Resolves to `null` when the key isn't configured so the
 * UI can degrade gracefully instead of throwing.
 */
let promise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!promise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    promise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return promise;
}

export function isStripeClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

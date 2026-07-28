import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// Signature verification needs the raw request body, so this must run on the
// Node.js runtime (not Edge) and must not be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives Stripe webhook events. Every request is verified against
 * STRIPE_WEBHOOK_SECRET before we trust it, so a forged POST is rejected.
 *
 * Get the signing secret from `stripe listen` (local) or the Dashboard →
 * Developers → Webhooks endpoint (deployed), and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (e) {
    console.error("stripe webhook signature verification failed", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Handle the events you care about. Kept lightweight (logging) — extend with
  // your own persistence/fulfilment as needed. Return 2xx quickly so Stripe
  // doesn't retry.
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.info(`✅ payment_intent.succeeded ${pi.id} — ${pi.amount} ${pi.currency}`);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.warn(`❌ payment_intent.payment_failed ${pi.id}`);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.info(`↩️  charge.refunded ${charge.id}`);
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      console.info(`🔗 account.updated ${account.id} — payouts_enabled=${account.payouts_enabled}`);
      break;
    }
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;
      console.info(`💸 payout.paid ${payout.id} — ${payout.amount} ${payout.currency}`);
      break;
    }
    default:
      console.info(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

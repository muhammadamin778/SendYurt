import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/supabase/app-session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Returns a SetupIntent client secret so the browser can save a card with
 * Stripe Elements without charging it. Reuses the user's existing Stripe
 * customer (looked up from any previously-saved card) or creates one.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();

    const existing = await prisma.card.findFirst({
      where: { userId: session.user.id, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    let customerId = existing?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: { platform_user_id: session.user.id },
      });
      customerId = customer.id;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: { platform_user_id: session.user.id },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId });
  } catch (e) {
    console.error("stripe setup-intent failed", e);
    return NextResponse.json({ error: "setup_failed" }, { status: 502 });
  }
}

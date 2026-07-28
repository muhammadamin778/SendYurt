import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const payoutSchema = z.object({
  connectedAccountId: z.string().trim().startsWith("acct_"),
  amount: z.number().int().positive().max(99_999_999),
  currency: z.string().trim().toLowerCase().min(3).max(4).default("usd"),
});

/**
 * Pays out available funds from a connected account's Stripe balance to its
 * external bank account. The payout is created **on behalf of** the connected
 * account via the `stripeAccount` request option — the platform never touches
 * the money directly, which keeps the flow secure and auditable.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { connectedAccountId, amount, currency } = parsed.data;

  try {
    const stripe = getStripe();
    const payout = await stripe.payouts.create(
      {
        amount,
        currency,
        metadata: { platform_user_id: session.user.id },
      },
      { stripeAccount: connectedAccountId },
    );

    return NextResponse.json({
      payoutId: payout.id,
      status: payout.status,
      amount: payout.amount,
      currency: payout.currency,
      arrivalDate: payout.arrival_date,
    });
  } catch (e) {
    console.error("stripe payout failed", e);
    return NextResponse.json({ error: "payout_failed" }, { status: 502 });
  }
}

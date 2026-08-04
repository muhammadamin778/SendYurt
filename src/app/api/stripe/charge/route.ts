import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { computePlatformFee, getStripe, isStripeConfigured, PLATFORM_FEE_BPS } from "@/lib/stripe";

export const runtime = "nodejs";

const chargeSchema = z.object({
  // Amount in the smallest currency unit (e.g. cents). Capped defensively.
  amount: z.number().int().positive().max(99_999_999),
  currency: z.string().trim().toLowerCase().min(3).max(4).default("usd"),
  // When present, this is a Connect destination charge: funds are routed to the
  // connected account and the platform keeps `application_fee_amount`.
  connectedAccountId: z.string().trim().startsWith("acct_").optional(),
  description: z.string().trim().max(500).optional(),
});

/**
 * Creates a PaymentIntent and returns its client secret for the frontend to
 * confirm. When `connectedAccountId` is supplied it becomes a destination
 * charge and the platform commission is calculated and collected automatically
 * via `application_fee_amount`.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  // Money endpoints must never be open — require a signed-in user.
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Keyed per user, so one account cannot exhaust anyone else's allowance.
  const limit = rateLimit(`charge:${session.user.id}`, LIMITS.stripeCharge);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = chargeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { amount, currency, connectedAccountId, description } = parsed.data;

  const platformFee = connectedAccountId ? computePlatformFee(amount) : 0;

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      description,
      metadata: {
        platform_user_id: session.user.id,
        platform_fee_bps: String(PLATFORM_FEE_BPS),
      },
      ...(connectedAccountId
        ? {
            application_fee_amount: platformFee,
            transfer_data: { destination: connectedAccountId },
          }
        : {}),
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      currency,
      platformFee,
      netToConnectedAccount: connectedAccountId ? amount - platformFee : null,
    });
  } catch (e) {
    console.error("stripe charge failed", e);
    return NextResponse.json({ error: "charge_failed" }, { status: 502 });
  }
}

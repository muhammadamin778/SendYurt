import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const connectSchema = z.object({
  // Reuse an existing connected account to (re)generate an onboarding link,
  // or omit to create a fresh Express account.
  accountId: z.string().trim().startsWith("acct_").optional(),
  email: z.string().trim().email().max(254).optional(),
});

/**
 * Creates (or reuses) a Stripe Connect **Express** account and returns a hosted
 * onboarding link. Completing onboarding is what lets a recipient receive
 * destination charges and take payouts.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Keyed per user, so one account cannot exhaust anyone else's allowance.
  const limit = rateLimit(`connect:${session.user.id}`, LIMITS.stripeConnect);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — we'll create a brand-new account.
  }
  const parsed = connectSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const accountId =
      parsed.data.accountId ??
      (
        await stripe.accounts.create({
          type: "express",
          email: parsed.data.email,
          metadata: { platform_user_id: session.user.id },
        })
      ).id;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/stripe/connect?refresh=1`,
      return_url: `${origin}/dashboard?connect=done`,
      type: "account_onboarding",
    });

    return NextResponse.json({ accountId, onboardingUrl: link.url });
  } catch (e) {
    console.error("stripe connect onboarding failed", e);
    return NextResponse.json({ error: "connect_failed" }, { status: 502 });
  }
}

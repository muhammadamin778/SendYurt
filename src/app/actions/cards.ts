"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/supabase/app-session";
import { HOME_CURRENCY, parseMoney, toBigInt, toMinor, type Minor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { addCardSchema, saveStripeCardSchema } from "@/lib/validators";

export type PlainCard = {
  id: string;
  brand: string;
  last4: string;
  holderName: string;
  expiry: string;
  balance: Minor;
  isDefault: boolean;
};

export type AddCardResult =
  | { ok: true; card: PlainCard }
  | { ok: false; error: string };

// SendYurt has no payment processor, so a newly linked card is seeded with a
// stored-value balance (UZS) purely so transfers can be tried and the
// insufficient-funds path can be demonstrated. Real integration would charge
// the card through a tokenising processor instead of holding a balance.
// 3 000 000 UZS expressed in minor units (tiyin).
const DEMO_CARD_BALANCE = parseMoney("3000000", HOME_CURRENCY)!;

/**
 * Links a funding card. PCI-DSS: only the last four digits are persisted —
 * never the full PAN and never the CVC (the form never sends the CVC here).
 */
export async function addCard(input: unknown): Promise<AddCardResult> {
  try {
    const session = await getAppSession();
    if (!session?.user?.id) return { ok: false, error: "unauthorized" };

    const parsed = addCardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };
    const { holderName, cardNumber, expiry, brand } = parsed.data;

    const last4 = cardNumber.slice(-4);
    const isFirst =
      (await prisma.card.count({ where: { userId: session.user.id } })) === 0;

    const card = await prisma.card.create({
      data: {
        userId: session.user.id,
        brand,
        last4,
        holderName,
        expiry,
        balance: toBigInt(DEMO_CARD_BALANCE),
        isDefault: isFirst,
      },
      select: {
        id: true,
        brand: true,
        last4: true,
        holderName: true,
        expiry: true,
        balance: true,
        isDefault: true,
      },
    });

    revalidatePath("/[locale]/(app)/dashboard", "page");
    return { ok: true, card: { ...card, balance: toMinor(card.balance) } };
  } catch (e) {
    console.error("addCard failed", e);
    return { ok: false, error: "server" };
  }
}

// Stripe's card.brand → our internal brand slug.
const STRIPE_BRAND: Record<string, string> = {
  visa: "visa",
  mastercard: "mc",
  amex: "amex",
  discover: "discover",
  jcb: "jcb",
  unionpay: "unionpay",
  diners: "diners",
};

/**
 * Persists a card that was tokenized by Stripe Elements. The full card lives at
 * Stripe; we retrieve the PaymentMethod to store only the masked details plus
 * the Stripe references. A card saved this way is charged on send (real Stripe
 * PaymentIntent) rather than debiting a stored balance.
 */
export async function saveStripeCard(input: unknown): Promise<AddCardResult> {
  try {
    const session = await getAppSession();
    if (!session?.user?.id) return { ok: false, error: "unauthorized" };

    const parsed = saveStripeCardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };
    const { paymentMethodId, holderName } = parsed.data;

    const stripe = getStripe();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.type !== "card" || !pm.card) return { ok: false, error: "invalid_card" };

    const customerId = typeof pm.customer === "string" ? pm.customer : (pm.customer?.id ?? null);
    const brand = STRIPE_BRAND[pm.card.brand] ?? "card";
    const last4 = pm.card.last4 ?? "0000";
    const expiry = `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}`;
    const name = holderName?.trim() || pm.billing_details?.name || session.user.name || "Cardholder";

    const isFirst = (await prisma.card.count({ where: { userId: session.user.id } })) === 0;

    const card = await prisma.card.create({
      data: {
        userId: session.user.id,
        brand,
        last4,
        holderName: name,
        expiry,
        // Stripe cards are charged on send — no stored balance.
        balance: 0n,
        currency: "USD",
        isDefault: isFirst,
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
      },
      select: {
        id: true,
        brand: true,
        last4: true,
        holderName: true,
        expiry: true,
        balance: true,
        isDefault: true,
      },
    });

    revalidatePath("/[locale]/(app)/dashboard", "page");
    return { ok: true, card: { ...card, balance: toMinor(card.balance) } };
  } catch (e) {
    console.error("saveStripeCard failed", e);
    return { ok: false, error: "server" };
  }
}

/** The signed-in user's funding cards, default first, as plain JSON. */
export async function listCards(): Promise<PlainCard[]> {
  const session = await getAppSession();
  if (!session?.user?.id) return [];
  const cards = await prisma.card.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      brand: true,
      last4: true,
      holderName: true,
      expiry: true,
      balance: true,
      isDefault: true,
    },
  });
  return cards.map((c) => ({ ...c, balance: toMinor(c.balance) }));
}

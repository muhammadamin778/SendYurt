"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/supabase/app-session";
import { prisma } from "@/lib/prisma";
import { addCardSchema } from "@/lib/validators";

export type PlainCard = {
  id: string;
  brand: string;
  last4: string;
  holderName: string;
  expiry: string;
  balance: number;
  isDefault: boolean;
};

export type AddCardResult =
  | { ok: true; card: PlainCard }
  | { ok: false; error: string };

// SendYurt has no payment processor, so a newly linked card is seeded with a
// stored-value balance (UZS) purely so transfers can be tried and the
// insufficient-funds path can be demonstrated. Real integration would charge
// the card through a tokenising processor instead of holding a balance.
const DEMO_CARD_BALANCE = 3_000_000;

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
        balance: DEMO_CARD_BALANCE,
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
    return { ok: true, card: { ...card, balance: card.balance.toNumber() } };
  } catch (e) {
    console.error("addCard failed", e);
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
  return cards.map((c) => ({ ...c, balance: c.balance.toNumber() }));
}

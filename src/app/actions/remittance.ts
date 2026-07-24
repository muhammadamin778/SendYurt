"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/supabase/app-session";
import { getUzsRates } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { computeQuotes } from "@/lib/rates";
import { remittanceSchema } from "@/lib/validators";

export type ActionResult =
  | { ok: true }
  // On "insufficient_funds", `balance` and `amount` (both UZS) are included so
  // the client can render the exact decline message.
  | { ok: false; error: string; balance?: number; amount?: number };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Thrown inside the transaction to force a rollback when a card can't cover the debit. */
class InsufficientFundsError extends Error {}

/**
 * Records a completed remittance from the Review & Confirm step. The quote is
 * recomputed server-side from the chosen provider and live rates — the client
 * only names the provider, amount and currency, so it cannot inflate the
 * amount the family receives. The row feeds the dashboard, history and the
 * Trust Score.
 */
export async function createRemittance(input: unknown): Promise<ActionResult> {
  try {
    const session = await getAppSession();
    if (!session?.user?.id) return fail("unauthorized");

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, householdId: true, accessRole: true },
    });
    if (!dbUser) return fail("unauthorized");
    if (dbUser.accessRole !== "ADMIN") return fail("forbidden");

    const parsed = remittanceSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { providerId, amount, currency, cardId } = parsed.data;

    const [provider, fx] = await Promise.all([
      prisma.remittanceProvider.findUnique({ where: { id: providerId } }),
      getUzsRates(),
    ]);
    if (!provider) return fail("not_found");

    // Recompute the quote from trusted data; ignore any client figures.
    const [quote] = computeQuotes([provider], amount, currency, fx.rates);
    if (!quote) return fail("validation");

    // The UZS amount the funding card must cover (matches the "recipient
    // receives exactly" figure shown on the Review step).
    const uzsCost = Math.round(quote.receivedUzs);

    // If a funding card was chosen, it must exist and cover the transfer.
    // We validate up-front for a precise error, then re-check atomically
    // inside the transaction below to close the race window.
    let card: { id: string; balance: number } | null = null;
    if (cardId) {
      const found = await prisma.card.findFirst({
        where: { id: cardId, userId: dbUser.id },
        select: { id: true, balance: true },
      });
      if (!found) return fail("card_not_found");
      const balance = found.balance.toNumber();
      if (balance < uzsCost) {
        return { ok: false, error: "insufficient_funds", balance, amount: uzsCost };
      }
      card = { id: found.id, balance };
    }

    // The recipient is the household's receiver, if one exists.
    const receiver = await prisma.user.findFirst({
      where: { householdId: dbUser.householdId, role: "RECEIVER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    try {
      await prisma.$transaction(async (tx) => {
        // Conditional debit: only decrements when the balance still covers the
        // cost, so two concurrent transfers can't overdraw. The DB CHECK
        // (Card_balance_nonneg) is the last line of defense.
        if (card) {
          const debited = await tx.card.updateMany({
            where: { id: card.id, userId: dbUser.id, balance: { gte: uzsCost } },
            data: { balance: { decrement: uzsCost } },
          });
          if (debited.count !== 1) throw new InsufficientFundsError();
        }

        await tx.transaction.create({
          data: {
            householdId: dbUser.householdId,
            type: "REMITTANCE",
            senderId: dbUser.id,
            receiverId: receiver?.id ?? null,
            providerId: provider.id,
            amount: uzsCost,
            currency: "UZS",
            sourceAmount: amount,
            sourceCurrency: currency,
            date: new Date(),
            status: "COMPLETED",
          },
        });
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) {
        // Re-read the (unchanged) balance for the message; the debit rolled back.
        const fresh = card
          ? (await prisma.card.findUnique({ where: { id: card.id }, select: { balance: true } }))?.balance.toNumber() ?? card.balance
          : 0;
        return { ok: false, error: "insufficient_funds", balance: fresh, amount: uzsCost };
      }
      throw e;
    }

    revalidatePath("/[locale]/(app)/dashboard", "page");
    revalidatePath("/[locale]/(app)/history", "page");
    revalidatePath("/[locale]/(app)/trust", "page");
    return { ok: true };
  } catch (e) {
    console.error("createRemittance failed", e);
    return fail("server");
  }
}

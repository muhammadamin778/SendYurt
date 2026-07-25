"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getAppSession } from "@/lib/supabase/app-session";
import { evaluateFunding } from "@/lib/funding";
import { getUzsRates } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { toBigInt, toMinor, type Minor } from "@/lib/money";
import { computeQuotes } from "@/lib/rates";
import { recordCreation } from "@/lib/transaction-events";
import { remittanceSchema } from "@/lib/validators";

export type ActionResult =
  | { ok: true }
  // On "insufficient_funds", `balance` and `amount` (both UZS minor units)
  // are included so the client can render the exact decline message.
  | { ok: false; error: string; balance?: Minor; amount?: Minor };

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
    const { providerId, amount, currency, cardId, idempotencyKey } = parsed.data;

    // Idempotent replay: if this key already produced a transfer, return
    // success without creating a second record — and, critically, without a
    // second card debit. A double click or a network retry is therefore safe.
    if (idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) return { ok: true };
    }

    const [provider, fx] = await Promise.all([
      prisma.remittanceProvider.findUnique({ where: { id: providerId } }),
      getUzsRates(),
    ]);
    if (!provider) return fail("not_found");

    // Recompute the quote from trusted data; ignore any client figures.
    const [quote] = computeQuotes([provider], amount, currency, fx.rates);
    if (!quote) return fail("validation");

    // The UZS the funding card must cover, in minor units (tiyin) — matches
    // the "recipient receives exactly" figure on the Review step. Already
    // rounded once inside computeQuotes, so there is no second rounding here.
    const uzsCost = quote.receivedUzs;

    // A funding source is MANDATORY. Previously `cardId` was optional and the
    // whole balance check sat behind `if (cardId)`, so a request that simply
    // omitted it recorded a completed transfer while moving no money and
    // checking no balance. Server actions are callable endpoints, so this is
    // enforced here rather than trusted to the UI.
    if (!cardId) return fail("card_required");

    const found = await prisma.card.findFirst({
      where: { id: cardId, userId: dbUser.id },
      select: { id: true, balance: true },
    });
    if (!found) return fail("card_not_found");
    const balance = toMinor(found.balance);

    // Same rules the client used to disable the button — re-evaluated here,
    // where they're authoritative. Re-checked atomically in the transaction
    // below to close the race between two concurrent transfers.
    const decision = evaluateFunding({ balance, cost: uzsCost });
    if (!decision.ok) {
      if (decision.reason === "insufficient_funds" || decision.reason === "zero_balance") {
        return { ok: false, error: decision.reason, balance, amount: uzsCost };
      }
      return fail(decision.reason);
    }
    const card = { id: found.id, balance };

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
        // Both operands are minor units, written as BigInt so the comparison
        // and the decrement happen in exact integer arithmetic in Postgres.
        const costBig = toBigInt(uzsCost);
        const debited = await tx.card.updateMany({
          where: { id: card.id, userId: dbUser.id, balance: { gte: costBig } },
          data: { balance: { decrement: costBig } },
        });
        if (debited.count !== 1) throw new InsufficientFundsError();

        const created = await tx.transaction.create({
          data: {
            householdId: dbUser.householdId,
            type: "REMITTANCE",
            senderId: dbUser.id,
            receiverId: receiver?.id ?? null,
            providerId: provider.id,
            // `amount` is UZS minor units; `sourceAmount` is minor units of
            // `currency` — two different currencies in the same row.
            amount: costBig,
            currency: "UZS",
            sourceAmount: toBigInt(amount),
            sourceCurrency: currency,
            date: new Date(),
            status: "COMPLETED",
            idempotencyKey: idempotencyKey ?? null,
          },
          select: { id: true, status: true },
        });

        // Creation is itself a state transition, so it is logged like any
        // other — the transition log is complete from the first row.
        await recordCreation(tx, created.id, created.status, dbUser.id);
      });
    } catch (e) {
      // Lost a race with a concurrent replay of the same key: the unique index
      // rejected the duplicate, which means the original already committed.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: true };
      }
      if (e instanceof InsufficientFundsError) {
        // Lost the race to a concurrent transfer. Re-read the (unchanged)
        // balance for the message; the debit rolled back.
        const row = await prisma.card.findUnique({
          where: { id: card.id },
          select: { balance: true },
        });
        const fresh = row ? toMinor(row.balance) : card.balance;
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

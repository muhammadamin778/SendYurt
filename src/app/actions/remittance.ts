"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUzsRates } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { computeQuotes } from "@/lib/rates";
import { remittanceSchema } from "@/lib/validators";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Records a completed remittance from the Review & Confirm step. The quote is
 * recomputed server-side from the chosen provider and live rates — the client
 * only names the provider, amount and currency, so it cannot inflate the
 * amount the family receives. The row feeds the dashboard, history and the
 * Trust Score.
 */
export async function createRemittance(input: unknown): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return fail("unauthorized");

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, householdId: true, accessRole: true },
    });
    if (!dbUser) return fail("unauthorized");
    if (dbUser.accessRole !== "ADMIN") return fail("forbidden");

    const parsed = remittanceSchema.safeParse(input);
    if (!parsed.success) return fail("validation");
    const { providerId, amount, currency } = parsed.data;

    const [provider, fx] = await Promise.all([
      prisma.remittanceProvider.findUnique({ where: { id: providerId } }),
      getUzsRates(),
    ]);
    if (!provider) return fail("not_found");

    // Recompute the quote from trusted data; ignore any client figures.
    const [quote] = computeQuotes([provider], amount, currency, fx.rates);
    if (!quote) return fail("validation");

    // The recipient is the household's receiver, if one exists.
    const receiver = await prisma.user.findFirst({
      where: { householdId: dbUser.householdId, role: "RECEIVER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    await prisma.transaction.create({
      data: {
        householdId: dbUser.householdId,
        type: "REMITTANCE",
        senderId: dbUser.id,
        receiverId: receiver?.id ?? null,
        providerId: provider.id,
        amount: Math.round(quote.receivedUzs),
        currency: "UZS",
        sourceAmount: amount,
        sourceCurrency: currency,
        date: new Date(),
        status: "COMPLETED",
      },
    });

    revalidatePath("/[locale]/(app)/dashboard", "page");
    revalidatePath("/[locale]/(app)/history", "page");
    revalidatePath("/[locale]/(app)/trust", "page");
    return { ok: true };
  } catch (e) {
    console.error("createRemittance failed", e);
    return fail("server");
  }
}

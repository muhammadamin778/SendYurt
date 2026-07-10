"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOURCE_CURRENCIES } from "@/lib/rates";

const usualSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.enum(SOURCE_CURRENCIES as [string, ...string[]]),
});

/** Saves the user's "usual" transfer so the Rate Finder pre-fills itself. */
export async function saveUsualPreference(
  input: unknown,
): Promise<{ ok: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false };

  const parsed = usualSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        usualSendAmount: parsed.data.amount,
        usualSendCurrency: parsed.data.currency,
      },
    });
    revalidatePath("/[locale]/(app)/rates", "page");
    revalidatePath("/[locale]/(app)/dashboard", "page");
    return { ok: true };
  } catch (e) {
    console.error("saveUsualPreference failed", e);
    return { ok: false };
  }
}

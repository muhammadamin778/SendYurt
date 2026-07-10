"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Marks the first-run walkthrough as seen (finished or skipped). */
export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardedAt: new Date() },
    });
    return { ok: true };
  } catch (e) {
    console.error("completeOnboarding failed", e);
    return { ok: false };
  }
}

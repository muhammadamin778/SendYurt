"use server";

import { getAppSession } from "@/lib/supabase/app-session";
import { prisma } from "@/lib/prisma";

/** Marks the first-run walkthrough as seen (finished or skipped). */
export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const session = await getAppSession();
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

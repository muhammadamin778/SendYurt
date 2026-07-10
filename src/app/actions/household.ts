"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  memberId: z.string().min(1),
  accessRole: z.enum(["ADMIN", "VIEWER"]),
});

export type HouseholdActionResult = { ok: true } | { ok: false; error: string };

/**
 * Admins can change other members' access. Nobody can change their own
 * role — that guarantees at least one admin (the actor) always remains.
 */
export async function setMemberAccess(input: unknown): Promise<HouseholdActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { memberId, accessRole } = parsed.data;

  if (memberId === session.user.id) return { ok: false, error: "self" };

  try {
    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true, accessRole: true },
    });
    if (!actor || actor.accessRole !== "ADMIN") {
      return { ok: false, error: "forbidden" };
    }

    // Scoped update: only members of the actor's own household.
    const updated = await prisma.user.updateMany({
      where: { id: memberId, householdId: actor.householdId },
      data: { accessRole },
    });
    if (updated.count === 0) return { ok: false, error: "not_found" };

    revalidatePath("/[locale]/(app)/household", "page");
    return { ok: true };
  } catch (e) {
    console.error("setMemberAccess failed", e);
    return { ok: false, error: "server" };
  }
}

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

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  currency: z.enum(["UZS", "USD", "EUR"]),
  privacyMode: z.boolean(),
  trustScoreSharing: z.boolean(),
});

const removeSchema = z.object({ memberId: z.string().min(1) });

export type HouseholdActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<{ userId: string; householdId: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { householdId: true, accessRole: true },
  });
  if (!actor || actor.accessRole !== "ADMIN") return null;
  return { userId: session.user.id, householdId: actor.householdId };
}

/** Owners/admins can rename the household and change its shared settings. */
export async function updateHouseholdSettings(input: unknown): Promise<HouseholdActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "forbidden" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    await prisma.household.update({
      where: { id: admin.householdId },
      data: parsed.data,
    });
    revalidatePath("/[locale]/(app)/household", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateHouseholdSettings failed", e);
    return { ok: false, error: "server" };
  }
}

/**
 * Remove a member from the household. Guarded: admins only, never yourself,
 * never the owner (earliest member). The member's ledger references are
 * detached first so foreign keys don't block the delete.
 */
export async function removeMember(input: unknown): Promise<HouseholdActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "forbidden" };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { memberId } = parsed.data;
  if (memberId === admin.userId) return { ok: false, error: "self" };

  try {
    const target = await prisma.user.findFirst({
      where: { id: memberId, householdId: admin.householdId },
      select: { id: true },
    });
    if (!target) return { ok: false, error: "not_found" };

    const owner = await prisma.user.findFirst({
      where: { householdId: admin.householdId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (owner?.id === memberId) return { ok: false, error: "owner" };

    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({ where: { senderId: memberId }, data: { senderId: null } });
      await tx.transaction.updateMany({ where: { receiverId: memberId }, data: { receiverId: null } });
      await tx.user.delete({ where: { id: memberId } });
    });

    revalidatePath("/[locale]/(app)/household", "page");
    return { ok: true };
  } catch (e) {
    console.error("removeMember failed", e);
    return { ok: false, error: "server" };
  }
}

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

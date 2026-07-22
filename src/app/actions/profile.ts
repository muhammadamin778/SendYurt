"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import { prisma } from "@/lib/prisma";

export type ProfileResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Profile picture                                                     */
/* ------------------------------------------------------------------ */

// A small downscaled data URL (the client resizes before sending). Cap the
// stored size so a single row can't bloat the SQLite/Postgres table.
const imageSchema = z
  .string()
  .startsWith("data:image/", "not an image")
  .max(700_000, "image too large");

export async function updateProfileImage(dataUrl: unknown): Promise<ProfileResult> {
  const session = await getAppSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = imageSchema.safeParse(dataUrl);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: parsed.data },
    });
    revalidatePath("/[locale]/(app)", "layout");
    return { ok: true };
  } catch (e) {
    console.error("updateProfileImage failed", e);
    return { ok: false, error: "server" };
  }
}

export async function removeProfileImage(): Promise<ProfileResult> {
  const session = await getAppSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { image: null } });
    revalidatePath("/[locale]/(app)", "layout");
    return { ok: true };
  } catch (e) {
    console.error("removeProfileImage failed", e);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------ */
/* Display name                                                        */
/* ------------------------------------------------------------------ */

const nameSchema = z.string().trim().min(2, "too short").max(80, "too long");

export async function updateProfileName(name: unknown): Promise<ProfileResult> {
  const session = await getAppSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data },
    });
    revalidatePath("/[locale]/(app)", "layout");
    return { ok: true };
  } catch (e) {
    console.error("updateProfileName failed", e);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------ */
/* Add household member (family owner / admin only)                    */
/* ------------------------------------------------------------------ */

const memberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.enum(["SENDER", "RECEIVER"]),
});

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "member"
  );
}

/**
 * The family owner (an ADMIN) can add a member directly. We mint a member
 * login (generated address + temporary password) inside the owner's
 * household and hand the credentials back once so they can be shared. New
 * members start as VIEWER; the owner can promote them from the Family page.
 */
export async function addHouseholdMember(
  input: unknown,
): Promise<ProfileResult<{ email: string; tempPassword: string }>> {
  const session = await getAppSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { name, role } = parsed.data;

  try {
    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true, accessRole: true },
    });
    if (!actor || actor.accessRole !== "ADMIN") return { ok: false, error: "forbidden" };

    const count = await prisma.user.count({ where: { householdId: actor.householdId } });
    if (count >= 8) return { ok: false, error: "limit" };

    // Unique-ish generated email + a readable temporary password.
    const email = `${slug(name)}.${randomBytes(3).toString("hex")}@sendyurt.family`;
    const tempPassword = `Yurt-${randomBytes(3).toString("hex")}`;
    const passwordHash = await hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        accessRole: "VIEWER",
        languagePref: "uz",
        householdId: actor.householdId,
      },
    });

    revalidatePath("/[locale]/(app)/household", "page");
    revalidatePath("/[locale]/(app)/profile", "page");
    return { ok: true, email, tempPassword };
  } catch (e) {
    console.error("addHouseholdMember failed", e);
    return { ok: false, error: "server" };
  }
}

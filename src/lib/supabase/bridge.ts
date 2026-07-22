import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";

/**
 * Identity bridge. Supabase Auth owns identity (login/signup); the legacy
 * SendYurt features (household, budgets, trust, remittances, admin) are keyed
 * to a Prisma `User`. This links the two by email: find the Prisma user for
 * the signed-in Supabase account, creating one (plus a household) on first
 * sight so a brand-new signup lands in a working app.
 *
 * The Prisma `passwordHash` is now a dead placeholder — authentication never
 * touches it; Supabase verifies credentials. Signup preferences (name, family
 * role, household name / invite code) ride along in the Supabase user's
 * metadata and are honoured on first bridge.
 */

export const BRIDGE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  householdId: true,
  accessRole: true,
  image: true,
  adminRole: true,
  suspended: true,
} satisfies Prisma.UserSelect;

export type BridgedUser = Prisma.UserGetPayload<{ select: typeof BRIDGE_USER_SELECT }>;

// Never used to authenticate — Supabase does that. Marks the row as
// Supabase-managed so it's obvious the local hash is not a real credential.
const PLACEHOLDER_HASH = "supabase-managed-no-local-password";

export async function bridgeUser(supaUser: SupabaseUser): Promise<BridgedUser | null> {
  const email = supaUser.email?.toLowerCase().trim();
  if (!email) return null;

  const existing = await prisma.user.findUnique({ where: { email }, select: BRIDGE_USER_SELECT });
  if (existing) return existing;

  const meta = (supaUser.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    email.split("@")[0];
  const role = meta.role === "RECEIVER" ? "RECEIVER" : "SENDER";
  const inviteCode = typeof meta.invite_code === "string" ? meta.invite_code.trim().toUpperCase() : "";
  const householdName =
    (typeof meta.household_name === "string" && meta.household_name.trim()) || `${name}'s family`;

  try {
    // Join an existing household by invite code, if provided and valid.
    if (meta.household_mode === "join" && inviteCode) {
      const household = await prisma.household.findUnique({ where: { inviteCode } });
      if (household) {
        return await prisma.user.create({
          data: { name, email, passwordHash: PLACEHOLDER_HASH, role, householdId: household.id },
          select: BRIDGE_USER_SELECT,
        });
      }
    }

    // Otherwise create a fresh household with this user as the first member.
    const create = () =>
      prisma.household.create({
        data: {
          name: householdName,
          inviteCode: generateInviteCode(),
          users: { create: { name, email, passwordHash: PLACEHOLDER_HASH, role } },
        },
        select: { users: { select: BRIDGE_USER_SELECT } },
      });

    let household;
    try {
      household = await create();
    } catch (e) {
      // Retry once on an invite-code collision.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && (e.meta?.target as string[])?.includes?.("inviteCode")) {
        household = await create();
      } else {
        throw e;
      }
    }
    return household.users[0];
  } catch (e) {
    // Lost a race to create the same email — just read the winner's row.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return prisma.user.findUnique({ where: { email }, select: BRIDGE_USER_SELECT });
    }
    console.error("bridgeUser failed", e);
    return null;
  }
}

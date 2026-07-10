import { prisma } from "@/lib/prisma";

export type NotificationType = "REMITTANCE_LOGGED" | "GOAL_NEAR" | "SCORE_CHANGE";

/**
 * Fan a notification out to every member of the household (each member
 * keeps their own read state). `payload` holds the raw values; the text
 * is localized at render time from the user's active language.
 */
export async function notifyHousehold(
  householdId: string,
  type: NotificationType,
  payload: Record<string, string | number>,
  options?: { excludeUserId?: string },
): Promise<void> {
  try {
    const members = await prisma.user.findMany({
      where: { householdId },
      select: { id: true },
    });
    const rows = members
      .filter((m) => m.id !== options?.excludeUserId)
      .map((m) => ({
        userId: m.id,
        householdId,
        type,
        payload: JSON.stringify(payload),
      }));
    if (rows.length > 0) {
      await prisma.notification.createMany({ data: rows });
    }
  } catch (e) {
    // Notifications are best-effort — never fail the triggering action.
    console.error("notifyHousehold failed", e);
  }
}

/** True when a goal contribution pushes progress across the 80% mark. */
export function crossedNearThreshold(
  beforeAmount: number,
  afterAmount: number,
  targetAmount: number,
  threshold = 0.8,
): boolean {
  if (targetAmount <= 0) return false;
  return beforeAmount / targetAmount < threshold && afterAmount / targetAmount >= threshold;
}

/** Significant Trust Score movement worth telling the family about. */
export function isSignificantScoreChange(from: number, to: number, minDelta = 5): boolean {
  return Math.abs(to - from) >= minDelta;
}

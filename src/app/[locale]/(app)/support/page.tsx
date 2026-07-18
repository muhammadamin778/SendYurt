import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SupportCenter } from "@/components/support/SupportCenter";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: t("title") };
}

export default async function SupportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const tTrust = await getTranslations("trust");

  const [{ result }, household] = await Promise.all([
    getTrustData(user.householdId),
    prisma.household.findUnique({
      where: { id: user.householdId },
      select: { users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  const trustLabel =
    result.score >= 75 ? tTrust("verdict.strong") : result.score >= 50 ? tTrust("verdict.growing") : tTrust("verdict.early");

  // Use a real household member as the sample transfer recipient when available.
  const other = household?.users.find((u) => u.id !== user.id) ?? household?.users[0];
  const parts = other?.name.trim().split(/\s+/).filter(Boolean) ?? [];
  const recipient = parts.length === 0 ? "Azizbek K." : parts[1] ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];

  const initial = (user.name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <SupportCenter
      user={{ name: user.name ?? "You", initial }}
      trustScore={result.score}
      trustLabel={trustLabel}
      recipient={recipient}
    />
  );
}

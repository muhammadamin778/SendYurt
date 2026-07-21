import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// The onboarding reference is Inter-exclusive.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("title") };
}

export default async function WelcomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();

  // Shown once per account: already-onboarded users go straight home.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboardedAt: true, name: true },
  });
  if (dbUser?.onboardedAt) {
    redirect(`/${locale}/dashboard`);
  }

  // The reference greets by first name ("Welcome home, Muhammadamin").
  const firstName = (dbUser?.name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div
      className={`onb-shell onb-bg ${inter.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10`}
    >
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed -right-24 -top-24 h-96 w-96 rounded-full bg-[#9df4c8]/10 blur-[140px]" />
      <div aria-hidden className="pointer-events-none fixed -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#fed65b]/10 blur-[120px]" />

      <OnboardingCarousel name={firstName} />
    </div>
  );
}

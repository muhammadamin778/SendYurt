import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

  return (
    <div className="flex min-h-screen flex-col bg-girih bg-sand-50">
      <header className="flex h-16 items-center justify-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <OnboardingCarousel name={dbUser?.name ?? ""} />
      </main>
    </div>
  );
}

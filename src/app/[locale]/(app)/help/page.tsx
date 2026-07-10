import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SuzaniDivider } from "@/components/ornament/Suzani";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/session";

const TOPICS = ["rates", "budget", "trust", "household", "notifications", "report"] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: t("title") };
}

export default async function HelpPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  await requireUser();
  const t = await getTranslations("help");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sand-800">{t("subtitle")}</p>
        <SuzaniDivider className="mt-3 h-4 w-44 text-terracotta-300" />
      </div>

      <div className="space-y-4">
        {TOPICS.map((topic) => (
          <Card key={topic} className="p-5">
            <h2 className="font-display text-lg font-bold text-samarkand-950">
              {t(`${topic}.q`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sand-800">
              {t(`${topic}.a`)}
            </p>
          </Card>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-sand-600">{t("footer")}</p>
    </div>
  );
}

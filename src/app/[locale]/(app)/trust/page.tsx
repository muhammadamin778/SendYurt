import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Milestones } from "@/components/trust/Milestones";
import { RemittanceTimeline } from "@/components/trust/RemittanceTimeline";
import { ScoreDial } from "@/components/trust/ScoreDial";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";
import { improvementTips } from "@/lib/trust-score";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trust" });
  return { title: t("title") };
}

function FactorCard({
  title,
  weightLabel,
  score,
  explanation,
}: {
  title: string;
  weightLabel: string;
  score: number;
  explanation: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">{title}</h3>
        <span className="text-xs font-medium text-sand-700">{weightLabel}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={score} max={100} label={title} className="flex-1" />
        <span className="w-10 text-right font-display text-lg font-bold text-samarkand-800">
          {score}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-sand-800">{explanation}</p>
    </Card>
  );
}

export default async function TrustPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("trust");
  const currentLocale = await getLocale();

  const { result, calculatedAt, hasDemoData, timeline, milestones } =
    await getTrustData(user.householdId);
  const tips = improvementTips(result);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sand-800">{t("subtitle")}</p>
        </div>
        <Link
          href="/trust/report"
          className="inline-flex items-center gap-2 rounded-lg border border-samarkand-300 bg-white px-4 py-2 text-sm font-semibold text-samarkand-800 transition-colors hover:bg-samarkand-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M7 17h10M7 13h10M7 9h4" strokeLinecap="round" />
            <path d="M5 3h10l4 4v14a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
          </svg>
          {t("report.open")}
        </Link>
      </div>

      {hasDemoData && (
        <Alert kind="info">
          <strong>{t("demoBadge")}</strong> — {t("demoNote")}
        </Alert>
      )}

      <Card accent className="bg-girih p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <ScoreDial
            score={result.score}
            label={t("title")}
            sublabel={t("outOf100")}
          />
          <div className="text-center sm:text-left">
            <h2 className="font-display text-xl font-bold text-samarkand-950">
              {result.score >= 75
                ? t("verdict.strong")
                : result.score >= 50
                  ? t("verdict.growing")
                  : t("verdict.early")}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-sand-800">
              {t("explainer")}
            </p>
            <p className="mt-3 text-xs text-sand-600">
              {t("calculatedAt", { date: formatDate(calculatedAt, currentLocale) })}
              {!result.hasEnoughData && <> · {t("provisional")}</>}
            </p>
          </div>
        </div>
      </Card>

      <section aria-label={t("timeline.title")}>
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("timeline.title")}
        </h2>
        <p className="mt-1 text-sm text-sand-800">{t("timeline.subtitle")}</p>
        <Card className="mt-4 p-5">
          <RemittanceTimeline months={timeline} />
        </Card>
      </section>

      <section aria-label={t("milestones.title")}>
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("milestones.title")}
        </h2>
        <p className="mt-1 text-sm text-sand-800">{t("milestones.subtitle")}</p>
        <div className="mt-4">
          <Milestones milestones={milestones} />
        </div>
      </section>

      <section aria-label={t("factorsTitle")}>
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("factorsTitle")}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FactorCard
            title={t("factors.consistency.title")}
            weightLabel={t("weight", { percent: 40 })}
            score={result.consistency.score}
            explanation={t("factors.consistency.explanation", {
              active: result.consistency.details.activeMonths,
              total: result.consistency.details.monthsConsidered,
            })}
          />
          <FactorCard
            title={t("factors.stability.title")}
            weightLabel={t("weight", { percent: 30 })}
            score={result.stability.score}
            explanation={t("factors.stability.explanation", {
              variation: result.stability.details.variationPercent,
            })}
          />
          <FactorCard
            title={t("factors.savings.title")}
            weightLabel={t("weight", { percent: 30 })}
            score={result.savings.score}
            explanation={t("factors.savings.explanation", {
              months: result.savings.details.savingsMonths,
              total: result.savings.details.monthsConsidered,
              rate: result.savings.details.savingsRatePercent,
            })}
          />
        </div>
      </section>

      <section aria-label={t("tipsTitle")}>
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("tipsTitle")}
        </h2>
        <Card className="mt-4 divide-y divide-sand-100">
          {tips.map((tip) => (
            <div key={tip} className="flex gap-3 px-5 py-4">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1.2 2.1h4.6c.2-.9.6-1.6 1.2-2.1A6 6 0 0012 3z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 19h4M11 21.5h2" strokeLinecap="round" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-ink">{t(`tips.${tip}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sand-800">
                  {t(`tips.${tip}.body`)}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <p className="text-xs leading-relaxed text-sand-600">{t("disclaimer")}</p>
    </div>
  );
}

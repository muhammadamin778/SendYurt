import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Milestones } from "@/components/trust/Milestones";
import {
  RemittanceTimeline,
  type TimelineMonth,
} from "@/components/trust/RemittanceTimeline";
import { ScoreDial } from "@/components/trust/ScoreDial";
import { formatDate } from "@/lib/format";
import { computeMilestones, type Milestone } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  computeTrustScore,
  improvementTips,
  type TrustScoreResult,
} from "@/lib/trust-score";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trust" });
  return { title: t("title") };
}

/**
 * Recompute the score from the ledger, and persist a snapshot when the
 * score changed or the latest snapshot is older than a day — so the
 * household accumulates an auditable score history.
 */
async function getScoreWithSnapshot(householdId: string): Promise<{
  result: TrustScoreResult;
  calculatedAt: Date;
  hasDemoData: boolean;
  timeline: TimelineMonth[];
  milestones: Milestone[];
}> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 13);

  const [transactions, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId, status: "COMPLETED", date: { gte: since } },
      select: { type: true, amount: true, date: true, isDemo: true },
    }),
    prisma.savingsGoal.findMany({
      where: { householdId },
      select: { currentAmount: true, targetAmount: true },
    }),
  ]);

  const result = computeTrustScore(
    transactions.map((t) => ({
      type: t.type,
      amount: t.amount.toNumber(),
      date: t.date,
    })),
  );

  const latest = await prisma.trustScoreSnapshot.findFirst({
    where: { householdId },
    orderBy: { calculatedAt: "desc" },
  });

  const staleMs = 24 * 60 * 60 * 1000;
  let calculatedAt = latest?.calculatedAt ?? new Date();
  if (
    !latest ||
    latest.score !== result.score ||
    Date.now() - latest.calculatedAt.getTime() > staleMs
  ) {
    const snapshot = await prisma.trustScoreSnapshot.create({
      data: {
        householdId,
        score: result.score,
        consistencyFactor: result.consistency.score,
        stabilityFactor: result.stability.score,
        savingsFactor: result.savings.score,
      },
    });
    calculatedAt = snapshot.calculatedAt;
  }

  // Last 12 calendar months of remittance arrivals, oldest first.
  const byMonth = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "REMITTANCE") continue;
    const key = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + tx.amount.toNumber());
  }
  const now = new Date();
  const timeline: TimelineMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    timeline.push({
      key,
      monthStartIso: d.toISOString(),
      amountUzs: byMonth.get(key) ?? null,
      isCurrent: i === 0,
    });
  }

  const milestones = computeMilestones(
    transactions.map((t) => ({ type: t.type, date: t.date })),
    goals.map((g) => ({
      currentAmount: g.currentAmount.toNumber(),
      targetAmount: g.targetAmount.toNumber(),
    })),
  );

  return {
    result,
    calculatedAt,
    hasDemoData: transactions.some((t) => t.isDemo),
    timeline,
    milestones,
  };
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
    await getScoreWithSnapshot(user.householdId);
  const tips = improvementTips(result);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sand-800">{t("subtitle")}</p>
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

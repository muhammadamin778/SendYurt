import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SuzaniDivider } from "@/components/ornament/Suzani";
import { currentPeriod, getMonthSummary } from "@/lib/budget-data";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { computeQuotes } from "@/lib/rates";
import { requireUser } from "@/lib/session";
import { computeTrustScore } from "@/lib/trust-score";

async function getTrustScore(householdId: string): Promise<number> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 13);
  const transactions = await prisma.transaction.findMany({
    where: { householdId, status: "COMPLETED", date: { gte: since } },
    select: { type: true, amount: true, date: true },
  });
  return computeTrustScore(
    transactions.map((t) => ({ type: t.type, amount: t.amount.toNumber(), date: t.date })),
  ).score;
}

async function RatesCard({ locale, primary }: { locale: string; primary: boolean }) {
  const t = await getTranslations("dashboard");
  const providers = await prisma.remittanceProvider.findMany();
  const [best] = computeQuotes(providers, 400, "USD");

  return (
    <Link href="/rates" className="group block h-full">
      <Card accent={primary} className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-lg">
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("cards.rates.title")}
        </h2>
        {best ? (
          <>
            <p className="mt-2 flex-1 text-sm text-sand-800">
              {t("cards.rates.teaser", { amount: "$400", provider: best.providerName })}
            </p>
            <p className="mt-3 font-display text-xl font-extrabold text-samarkand-800">
              ≈ {formatMoney(best.receivedUzs, "UZS", locale)}
            </p>
            <p className="mt-0.5 text-xs text-sand-600">{t("cards.rates.sample")}</p>
          </>
        ) : (
          <p className="mt-2 flex-1 text-sm text-sand-800">{t("quickRates")}</p>
        )}
        <span className="mt-3 text-sm font-semibold text-samarkand-700 group-hover:underline">
          {t("cards.rates.cta")} →
        </span>
      </Card>
    </Link>
  );
}

async function BudgetCard({
  householdId,
  locale,
  primary,
}: {
  householdId: string;
  locale: string;
  primary: boolean;
}) {
  const t = await getTranslations("dashboard");
  const summary = await getMonthSummary(householdId, currentPeriod());

  return (
    <Link href="/budget" className="group block h-full">
      <Card accent={primary} className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-lg">
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("cards.budget.title")}
        </h2>
        <dl className="mt-3 flex-1 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-sand-700">{t("cards.budget.income")}</dt>
            <dd className="font-semibold text-samarkand-800">
              {formatMoney(summary.incomeUzs, "UZS", locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sand-700">{t("cards.budget.spent")}</dt>
            <dd className="font-semibold text-terracotta-800">
              {formatMoney(summary.spentUzs, "UZS", locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sand-700">{t("cards.budget.saved")}</dt>
            <dd className="font-semibold text-ink">
              {formatMoney(summary.savedUzs, "UZS", locale)}
            </dd>
          </div>
        </dl>
        <span className="mt-3 text-sm font-semibold text-samarkand-700 group-hover:underline">
          {t("cards.budget.cta")} →
        </span>
      </Card>
    </Link>
  );
}

async function TrustCard({
  householdId,
  primary,
}: {
  householdId: string;
  primary: boolean;
}) {
  const t = await getTranslations("dashboard");
  const score = await getTrustScore(householdId);

  return (
    <Link href="/trust" className="group block h-full">
      <Card accent={primary} className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-lg">
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("cards.trust.title")}
        </h2>
        <div className="mt-3 flex flex-1 items-center gap-4">
          <span className="font-display text-4xl font-extrabold text-samarkand-800">
            {score}
          </span>
          <div className="flex-1">
            <ProgressBar value={score} max={100} label={t("cards.trust.title")} />
            <p className="mt-1.5 text-xs text-sand-700">{t("cards.trust.hint")}</p>
          </div>
        </div>
        <span className="mt-3 text-sm font-semibold text-samarkand-700 group-hover:underline">
          {t("cards.trust.cta")} →
        </span>
      </Card>
    </Link>
  );
}

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const currentLocale = await getLocale();

  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { name: true, inviteCode: true },
  });

  const isSender = user.role === "SENDER";

  const cards = isSender
    ? [
        <RatesCard key="rates" locale={currentLocale} primary />,
        <BudgetCard key="budget" householdId={user.householdId} locale={currentLocale} primary={false} />,
        <TrustCard key="trust" householdId={user.householdId} primary={false} />,
      ]
    : [
        <BudgetCard key="budget" householdId={user.householdId} locale={currentLocale} primary />,
        <TrustCard key="trust" householdId={user.householdId} primary />,
        <RatesCard key="rates" locale={currentLocale} primary={false} />,
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
          {t("greeting", { name: user.name ?? "" })}
        </h1>
        <p className="mt-1 text-sand-800">
          {household ? `${household.name} · ` : ""}
          {t(isSender ? "subtitleSender" : "subtitleReceiver")}
        </p>
        <SuzaniDivider className="mt-3 h-4 w-44 text-terracotta-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">{cards}</div>

      {household && (
        <Card className="bg-ikat p-5">
          <h2 className="font-display text-lg font-bold text-samarkand-950">
            {t("inviteTitle")}
          </h2>
          <p className="mt-1 text-sm text-sand-800">
            {t("inviteBody")}
          </p>
          <code className="mt-3 inline-block rounded-lg bg-samarkand-50 px-4 py-2 font-mono text-lg font-bold tracking-widest text-samarkand-800">
            {household.inviteCode}
          </code>
        </Card>
      )}
    </div>
  );
}

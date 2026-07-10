import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RateForm } from "@/components/rates/RateForm";
import { formatMoney, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { computeQuotes, MID_MARKET_UZS, SOURCE_CURRENCIES, type Quote } from "@/lib/rates";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "rates" });
  return { title: t("title") };
}

function parseParams(
  searchParams: { amount?: string; currency?: string },
  usual: { amount: number | null; currency: string | null },
) {
  const amountRaw = Number(searchParams.amount);
  // Explicit query wins; then the user's saved usual; then a sane default.
  const amount =
    Number.isFinite(amountRaw) && amountRaw > 0 && amountRaw <= 1_000_000
      ? amountRaw
      : (usual.amount ?? 400);
  const currency = SOURCE_CURRENCIES.includes(searchParams.currency as never)
    ? (searchParams.currency as string)
    : SOURCE_CURRENCIES.includes(usual.currency as never)
      ? (usual.currency as string)
      : "USD";
  return { amount, currency };
}

function SpeedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-sand-900">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

async function QuoteList({
  quotes,
  locale,
}: {
  quotes: Quote[];
  locale: string;
}) {
  const t = await getTranslations("rates");

  if (quotes.length === 0) {
    return <EmptyState>{t("empty")}</EmptyState>;
  }

  const best = quotes[0];

  return (
    <ol className="space-y-4" aria-label={t("resultsLabel")}>
      {quotes.map((q) => {
        const isBest = q.providerId === best.providerId;
        const lostVsBest = best.receivedUzs - q.receivedUzs;
        const speedLabel =
          q.transferSpeedHours <= 1
            ? t("speedMinutes")
            : q.transferSpeedHours <= 12
              ? t("speedHours", { hours: q.transferSpeedHours })
              : t("speedDays", { days: Math.round(q.transferSpeedHours / 24) });

        return (
          <li key={q.providerId}>
            <Card accent={isBest} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-samarkand-950">
                      {q.providerName}
                    </h3>
                    {isBest && (
                      <span className="rounded-full bg-terracotta-100 px-2.5 py-0.5 text-xs font-bold text-terracotta-800">
                        {t("bestValue")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <SpeedBadge label={speedLabel} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium uppercase tracking-wide text-sand-700">
                    {t("familyReceives")}
                  </div>
                  <div className="font-display text-2xl font-extrabold text-samarkand-800">
                    {formatMoney(q.receivedUzs, "UZS", locale)}
                  </div>
                  {!isBest && lostVsBest > 1000 && (
                    <div className="mt-0.5 text-xs text-terracotta-700">
                      −{formatMoney(lostVsBest, "UZS", locale)} {t("vsBest")}
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdown: send → fees → rate → received */}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-sand-200 pt-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-sand-700">{t("youSend")}</dt>
                  <dd className="font-semibold text-ink">
                    {formatMoney(q.sendAmount, q.currency, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-sand-700">{t("fees")}</dt>
                  <dd className="font-semibold text-ink">
                    −{formatMoney(q.totalFees, q.currency, locale)}
                    {q.percentFee > 0 && (
                      <span className="ml-1 text-xs font-normal text-sand-700">
                        ({formatNumber(q.percentFee, locale, 1)}%
                        {q.baseFee > 0
                          ? ` + ${formatMoney(q.baseFee, q.currency, locale)}`
                          : ""})
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-sand-700">{t("exchangeRate")}</dt>
                  <dd className="font-semibold text-ink">
                    1 {q.currency} = {formatNumber(q.effectiveRate, locale, q.effectiveRate < 100 ? 2 : 0)} UZS
                    <span className="ml-1 text-xs font-normal text-sand-700">
                      ({t("marginNote", { margin: formatNumber(q.marginPercent, locale, 1) })})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-sand-700">{t("received")}</dt>
                  <dd className="font-semibold text-samarkand-800">
                    {formatMoney(q.receivedUzs, "UZS", locale)}
                  </dd>
                </div>
              </dl>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export default async function RatesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { amount?: string; currency?: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("rates");
  const currentLocale = await getLocale();

  const prefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: { usualSendAmount: true, usualSendCurrency: true },
  });
  const usual = {
    amount: prefs?.usualSendAmount?.toNumber() ?? null,
    currency: prefs?.usualSendCurrency ?? null,
  };

  const { amount, currency } = parseParams(searchParams, usual);
  const providers = await prisma.remittanceProvider.findMany();
  const quotes = computeQuotes(providers, amount, currency);
  const isUsual = usual.amount === amount && usual.currency === currency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sand-800">{t("subtitle")}</p>
      </div>

      <Alert kind="info">
        <strong>{t("sampleBadge")}</strong> — {t("sampleNote", {
          rate: formatNumber(MID_MARKET_UZS[currency], currentLocale, currency === "KZT" ? 1 : 0),
          currency,
        })}
      </Alert>

      <Card className="p-5">
        <RateForm
          currencies={SOURCE_CURRENCIES}
          initialAmount={amount}
          initialCurrency={currency}
          isUsual={isUsual}
        />
      </Card>

      <QuoteList quotes={quotes} locale={currentLocale} />
    </div>
  );
}

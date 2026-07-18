import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { RateForm } from "@/components/rates/RateForm";
import { formatMoney, formatNumber } from "@/lib/format";
import { getUzsRates } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { computeQuotes, SOURCE_CURRENCIES, type Quote } from "@/lib/rates";
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

/* -- Inline glyphs (Material-Symbols equivalents, no extra font) --------- */
function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const ICON = {
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4",
  clock: "M12 7v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  bank: "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z",
  lock: "M6 11V8a6 6 0 1112 0v3M5 11h14v10H5zM12 15v3",
  headset: "M4 13a8 8 0 0116 0M4 13v3a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zm16 0v3a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z",
};

function speedLabel(hours: number, t: Awaited<ReturnType<typeof getTranslations>>) {
  return hours <= 1
    ? t("speedMinutes")
    : hours <= 12
      ? t("speedHours", { hours })
      : t("speedDays", { days: Math.round(hours / 24) });
}

async function ProviderList({
  quotes,
  bestId,
  locale,
}: {
  quotes: Quote[];
  bestId: string | undefined;
  locale: string;
}) {
  const t = await getTranslations("rates");

  if (quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8">
        <EmptyState>{t("empty")}</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-label={t("resultsLabel")}>
      {quotes.map((q) => {
        const isBest = q.providerId === bestId;
        const feeStr = `${q.baseFee === 0 ? t("free") : formatMoney(q.baseFee, q.currency, locale)} + ${formatNumber(q.marginPercent, locale, 1)}%`;
        return (
          <div
            key={q.providerId}
            className={`group relative rounded-2xl p-4 transition-all md:p-6 ${
              isBest
                ? "border-2 border-[#0a7c53] bg-white shadow-lg hover:-translate-y-0.5"
                : "border border-[#e2e8f0] bg-white shadow-sm hover:bg-[#f8fafc]"
            }`}
          >
            {isBest && (
              <div className="absolute -top-3 right-6 rounded-full bg-[#0a7c53] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {t("bestOverall")}
              </div>
            )}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${isBest ? "bg-[#0a7c53]/10 text-[#0a7c53]" : "bg-[#eef2f6] text-[#64748b]"}`}>
                  <Glyph d={isBest ? ICON.send : ICON.bank} className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-[18px] font-bold text-[#0f172a]">{q.providerName}</h4>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-[#64748b]">
                    <Glyph d={ICON.clock} className="h-3.5 w-3.5" />
                    {speedLabel(q.transferSpeedHours, t)}
                  </p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-6 md:max-w-xl md:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-tight text-[#94a3b8]">{t("feeSpread")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-[#0f172a]">{feeStr}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-tight text-[#94a3b8]">{t("exchangeRate")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-[#0f172a]">
                    {formatNumber(q.effectiveRate, locale, q.effectiveRate < 100 ? 2 : 0)}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className={`text-[11px] font-bold uppercase tracking-tight ${isBest ? "text-[#0a7c53]" : "text-[#94a3b8]"}`}>{t("totalTheyGet")}</p>
                  <p className={`mt-0.5 text-[18px] font-bold tabular-nums ${isBest ? "text-[#0a7c53]" : "text-[#0f172a]"}`}>
                    {formatMoney(q.receivedUzs, "UZS", locale)}
                  </p>
                </div>
              </div>

              <Link
                href={`/rates/review?provider=${encodeURIComponent(q.providerId)}&amount=${encodeURIComponent(q.sendAmount)}&currency=${encodeURIComponent(q.currency)}`}
                className={`w-full shrink-0 rounded-xl px-8 py-3 text-center font-bold transition-all active:scale-95 md:w-auto ${
                  isBest
                    ? "bg-[#0a7c53] text-white hover:bg-[#065f3e]"
                    : "border border-[#0a7c53] text-[#0a7c53] hover:bg-[#0a7c53]/5"
                }`}
              >
                {isBest ? t("sendNow") : t("select")}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function RatesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { amount?: string; currency?: string; sort?: string };
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
  const [providers, fx] = await Promise.all([
    prisma.remittanceProvider.findMany(),
    getUzsRates(),
  ]);

  const sort = searchParams.sort === "fee" ? "fee" : "received";
  let quotes = computeQuotes(providers, amount, currency, fx.rates);
  // best value (most received) is always highlighted, even when sorted by fee
  const bestId = quotes[0]?.providerId;
  if (sort === "fee") quotes = [...quotes].sort((a, b) => a.totalFees - b.totalFees);

  const isUsual = usual.amount === amount && usual.currency === currency;
  const qs = `amount=${encodeURIComponent(amount)}&currency=${encodeURIComponent(currency)}`;
  const rateStr = formatNumber(fx.rates[currency], currentLocale, currency === "KZT" ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a] md:text-[32px]">{t("title")}</h1>
        <p className="mt-1 text-[#64748b]">{t("subtitle")}</p>
      </div>

      {/* Calculator bento grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Input card */}
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:col-span-7">
          <RateForm
            currencies={SOURCE_CURRENCIES}
            initialAmount={amount}
            initialCurrency={currency}
            isUsual={isUsual}
          />
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#0a7c53]/30 bg-[#0a7c53]/[0.06] p-4">
            <div className="flex items-center gap-3">
              <span className="text-[#0a7c53]"><Glyph d={ICON.trend} className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-bold uppercase text-[#64748b]">{t("bestMarketRate")}</p>
                <p className="font-semibold tabular-nums tracking-wide text-[#065f3e]">
                  1 {currency} = {rateStr} UZS
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
              <span className={`h-2 w-2 rounded-full ${fx.live ? "bg-[#0a7c53]" : "bg-[#d9a441]"}`} aria-hidden="true" />
              {fx.live ? t("liveBadge") : t("sampleBadge")}
            </span>
          </div>
        </div>

        {/* Why SendYurt navy card */}
        <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-6 text-white md:col-span-5">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-sm font-medium text-white/60">{t("whyTitle")}</p>
            <h3 className="mt-1 text-[20px] font-semibold leading-snug">{t("whyHeadline")}</h3>
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[#4edea3]"><Glyph d={ICON.shield} className="h-5 w-5" /></span>
              <span className="text-sm">{t("whyVerified")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#4edea3]"><Glyph d={ICON.clock} className="h-5 w-5" /></span>
              <span className="text-sm">{t("whyDelivery")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-[#64748b]">{t("sortedBy")}:</span>
          <div className="flex gap-1 rounded-lg bg-[#eef2f6] p-1">
            <Link
              href={`/rates?${qs}&sort=received`}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${sort === "received" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
            >
              {t("sortReceived")}
            </Link>
            <Link
              href={`/rates?${qs}&sort=fee`}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${sort === "fee" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
            >
              {t("sortFee")}
            </Link>
          </div>
        </div>
        <p className="text-[11px] italic text-[#94a3b8]">
          {t("sampleNote", { currency, rate: rateStr })}
        </p>
      </div>

      {/* Provider list */}
      <ProviderList quotes={quotes} bestId={bestId} locale={currentLocale} />

      {/* Trust & security */}
      <section className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-[#0a7c53]/15 bg-[#0a7c53]/[0.04] p-8 md:grid-cols-2">
        <div>
          <h3 className="mb-4 text-[24px] font-bold text-[#065f3e]">{t("trustTitle")}</h3>
          <p className="mb-6 text-[#64748b]">{t("trustBody")}</p>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#065f3e]">
                <Glyph d={ICON.lock} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-[#0f172a]">{t("trustEncTitle")}</p>
                <p className="text-sm text-[#64748b]">{t("trustEncBody")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#065f3e]">
                <Glyph d={ICON.headset} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-[#0f172a]">{t("trustSupportTitle")}</p>
                <p className="text-sm text-[#64748b]">{t("trustSupportBody")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex h-64 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-6 shadow-xl md:h-80">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-[#4edea3]/10" />
          <div aria-hidden="true" className="pointer-events-none absolute right-16 top-16 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-3xl font-bold text-white">{t("whyDelivery")}</p>
            <p className="mt-1 text-sm text-white/60">{t("whyVerified")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

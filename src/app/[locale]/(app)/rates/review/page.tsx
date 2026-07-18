import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ConfirmTransfer } from "@/components/rates/ConfirmTransfer";
import { PaymentSelector } from "@/components/rates/PaymentSelector";
import { formatMoney, formatNumber } from "@/lib/format";
import { getUzsRates } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { computeQuotes, SOURCE_CURRENCIES } from "@/lib/rates";
import { requireUser } from "@/lib/session";
import { computeTrustScore } from "@/lib/trust-score";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "rates" });
  return { title: t("review.title") };
}

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON = {
  check: "M5 13l4 4L19 7",
  bank: "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z",
  clock: "M12 7v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z",
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4",
  gavel: "M12 3l6 6-3 3-6-6zM9 9l-6 6 3 3 6-6M14 14l6 6",
  lock: "M6 11V8a6 6 0 1112 0v3M5 11h14v10H5zM12 15v3",
};

export default async function ReviewTransferPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { provider?: string; amount?: string; currency?: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("rates");
  const currentLocale = await getLocale();

  const amount = Number(searchParams.amount);
  const currency = searchParams.currency ?? "";
  const providerId = searchParams.provider ?? "";

  // Missing or malformed selection → back to the finder.
  if (
    !providerId ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1_000_000 ||
    !SOURCE_CURRENCIES.includes(currency as never)
  ) {
    redirect(`/${locale}/rates`);
  }

  const [provider, fx, household] = await Promise.all([
    prisma.remittanceProvider.findUnique({ where: { id: providerId } }),
    getUzsRates(),
    prisma.household.findUnique({
      where: { id: user.householdId },
      select: {
        name: true,
        users: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, image: true, role: true },
        },
      },
    }),
  ]);

  if (!provider) redirect(`/${locale}/rates`);
  const [quote] = computeQuotes([provider!], amount, currency, fx.rates);
  if (!quote) redirect(`/${locale}/rates`);

  const receiver = household?.users.find((u) => u.role === "RECEIVER");
  const recipientName = receiver?.name ?? household?.name ?? "—";
  const recipientInitial = recipientName.trim().charAt(0).toUpperCase() || "?";

  // Current reliability score — computed for display without persisting a
  // snapshot (this isn't the Trust page). Sending strengthens it over time.
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 13);
  const txs = await prisma.transaction.findMany({
    where: { householdId: user.householdId, status: "COMPLETED", date: { gte: since } },
    select: { type: true, amount: true, date: true },
  });
  const score = computeTrustScore(
    txs.map((tx) => ({ type: tx.type, amount: tx.amount.toNumber(), date: tx.date })),
  ).score;

  const feeStr =
    quote!.totalFees === 0
      ? t("free")
      : formatMoney(quote!.totalFees, currency, currentLocale);
  const rateStr = formatNumber(fx.rates[currency], currentLocale, currency === "KZT" ? 1 : 0);
  const deliveryStr =
    quote!.transferSpeedHours <= 1
      ? t("speedMinutes")
      : quote!.transferSpeedHours <= 12
        ? t("speedHours", { hours: quote!.transferSpeedHours })
        : t("speedDays", { days: Math.round(quote!.transferSpeedHours / 24) });

  const steps = [t("review.stepAmount"), t("review.stepRecipient"), t("review.stepReview")] as const;

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Stepper */}
      <div className="mx-auto mb-8 max-w-2xl">
        <div className="flex items-center justify-between">
          {steps.map((label, i) => {
            const done = i < 2;
            const current = i === 2;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-[#0a7c53] text-white"
                        : "border-2 border-[#0a7c53] bg-white text-[#0a7c53]"
                    }`}
                  >
                    {done ? <Glyph d={ICON.check} className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-[13px] ${current ? "font-bold text-[#0a7c53]" : "text-[#64748b]"}`}>{label}</span>
                </div>
                {i < steps.length - 1 && <span className="mx-3 h-0.5 flex-1 rounded bg-[#0a7c53]" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: details */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="mb-1">
            <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a] md:text-[32px]">{t("review.title")}</h1>
            <p className="mt-1 text-[#64748b]">{t("review.subtitle")}</p>
          </div>

          {/* Recipient */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#0f172a]">{t("review.recipient")}</h2>
            </div>
            <div className="flex items-center gap-4">
              {receiver?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receiver.image} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dcfce7] text-lg font-bold text-[#0a7c53]">
                  {recipientInitial}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[16px] font-bold text-[#0f172a]">{recipientName}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-[#64748b]">
                  <Glyph d={ICON.bank} className="h-4 w-4" />
                  {t("review.recipientSub")}
                </p>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#0f172a]">{t("review.paymentMethod")}</h2>
            </div>
            <PaymentSelector />
          </div>

          {/* Trust impact + regulation */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[#b87500]"><Glyph d={ICON.shield} className="h-5 w-5" /></span>
                  <h3 className="text-[15px] font-bold text-[#0f172a]">{t("review.trustImpact")}</h3>
                </div>
                <p className="text-[13px] text-[#64748b]">{t("review.trustImpactBody")}</p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="text-2xl font-bold tabular-nums text-[#0a7c53]">{score}<span className="text-base font-normal text-[#94a3b8]">/100</span></div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-[#eef2f6]">
                  <div className="h-full rounded-full bg-[#0a7c53]" style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-6 text-white">
              <span className="shrink-0 text-[#4edea3]"><Glyph d={ICON.gavel} className="h-5 w-5" /></span>
              <p className="text-[13px] leading-relaxed text-white/85">{t("review.regulation")}</p>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-[18px] font-bold text-[#0f172a]">{t("review.summary")}</h2>

            <div className="space-y-3 border-b border-[#eef2f7] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">{t("review.youSend")}</span>
                <span className="font-bold tabular-nums text-[#0f172a]">{formatMoney(amount, currency, currentLocale)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">{t("review.transferFee")}</span>
                <span className={`font-bold tabular-nums ${quote!.totalFees === 0 ? "text-[#0a7c53]" : "text-[#0f172a]"}`}>{feeStr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">{t("review.exchangeRate")}</span>
                <span className="text-[13px] font-medium tabular-nums text-[#0f172a]">1 {currency} = {rateStr} UZS</span>
              </div>
            </div>

            <div className="my-4 rounded-xl bg-[#f1f5f9] p-4">
              <p className="mb-1 text-[13px] text-[#64748b]">{t("review.receivesExactly", { name: recipientName })}</p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[26px] font-bold leading-none tabular-nums text-[#0a7c53]">{formatMoney(quote!.receivedUzs, "UZS", currentLocale)}</div>
                <span className="shrink-0 rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0a7c53]">{t("review.guaranteed")}</span>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2 text-[13px] text-[#64748b]">
              <Glyph d={ICON.clock} className="h-5 w-5" />
              {t("review.estDelivery")}: <span className="font-bold text-[#0f172a]">{deliveryStr}</span>
            </div>

            <ConfirmTransfer providerId={provider!.id} amount={amount} currency={currency} />

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#eef2f7] pt-4">
              <span className="text-[#94a3b8]"><Glyph d={ICON.lock} className="h-4 w-4" /></span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#94a3b8]">{t("review.encryption")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

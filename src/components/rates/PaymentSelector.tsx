"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { useTransfer } from "@/components/rates/TransferContext";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mc: "Mastercard",
  humo: "HUMO",
  uzcard: "Uzcard",
  card: "Card",
};

const BANK_ICON = "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z";

/**
 * Payment-method chooser on the Review step. Lists the user's linked cards
 * with their real balances and drives the shared funding-card selection (see
 * TransferContext) so the Confirm button can enforce the funding rules.
 *
 * With no linked cards it shows an add-a-card prompt rather than a payment
 * option: every transfer must be funded by a real card, so offering a
 * choice here would only lead to a transfer the server will refuse.
 */
export function PaymentSelector() {
  const t = useTranslations("rates");
  const locale = useLocale();
  const { cards, uzsCost, selectedCardId, setSelectedCardId } = useTransfer();

  if (cards.length === 0) return <NoCards />;

  return (
    <div className="space-y-3">
      {cards.map((c) => {
        const active = c.id === selectedCardId;
        const empty = c.balance <= 0;
        const insufficient = c.balance < uzsCost;
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => setSelectedCardId(c.id)}
            className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors ${
              active ? "border-2 border-[#0a7c53] bg-[#0a7c53]/[0.06]" : "border border-[#e2e8f0] hover:bg-[#f8fafc]"
            }`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-[#0a7c53]" : "border-[#cbd5e1]"}`}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-[#0a7c53]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-bold text-[#0f172a]">
                {BRAND_LABEL[c.brand] ?? "Card"} •••• {c.last4}
                {empty && (
                  <span className="rounded-full bg-[#fef2f2] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#b91c1c]">
                    {t("review.emptyCard")}
                  </span>
                )}
              </span>
              <span className={`block text-[13px] ${insufficient ? "font-semibold text-[#b91c1c]" : "text-[#64748b]"}`}>
                {t("review.cardBalance", { amount: formatMoney(c.balance, "UZS", locale) })}
              </span>
            </span>
            <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 ${active ? "text-[#0a7c53]" : "text-[#94a3b8]"}`} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d={BANK_ICON} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shown when the user has no linked cards. A transfer must be funded by a real
 * card, so this offers the way forward (add one) instead of a payment choice
 * that would be refused at confirm time.
 */
function NoCards() {
  const t = useTranslations("rates");

  return (
    <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
      <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#e2e8f0] text-[#64748b]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d={BANK_ICON} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-[15px] font-bold text-[#0f172a]">{t("review.noCardTitle")}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[#64748b]">{t("review.noCardBody")}</p>
      <Link
        href="/wallet"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0a7c53] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#065f3e]"
      >
        {t("review.addCard")}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
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
 * Payment-method chooser on the Review step. When the user has linked cards it
 * lists them with their real balances and drives the shared funding-card
 * selection (see TransferContext) so the Confirm button can enforce the
 * insufficient-funds guard. With no linked cards it falls back to the original
 * presentational chooser.
 */
export function PaymentSelector() {
  const t = useTranslations("rates");
  const locale = useLocale();
  const { cards, uzsCost, selectedCardId, setSelectedCardId } = useTransfer();

  if (cards.length === 0) return <LegacySelector />;

  return (
    <div className="space-y-3">
      {cards.map((c) => {
        const active = c.id === selectedCardId;
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
              <span className="block text-[15px] font-bold text-[#0f172a]">
                {BRAND_LABEL[c.brand] ?? "Card"} •••• {c.last4}
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

/** Original presentational chooser, shown when no cards are linked. */
function LegacySelector() {
  const t = useTranslations("rates");
  const [method, setMethod] = useState<"balance" | "bank">("balance");

  const options = [
    { key: "balance" as const, title: t("review.payBalance"), sub: t("review.payBalanceSub"), icon: "M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4" },
    { key: "bank" as const, title: t("review.payBank"), sub: t("review.payBankSub"), icon: BANK_ICON },
  ];

  return (
    <div className="space-y-3">
      {options.map((o) => {
        const active = method === o.key;
        return (
          <button
            type="button"
            key={o.key}
            onClick={() => setMethod(o.key)}
            className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors ${
              active ? "border-2 border-[#0a7c53] bg-[#0a7c53]/[0.06]" : "border border-[#e2e8f0] hover:bg-[#f8fafc]"
            }`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-[#0a7c53]" : "border-[#cbd5e1]"}`}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-[#0a7c53]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-[#0f172a]">{o.title}</span>
              <span className="block text-[13px] text-[#64748b]">{o.sub}</span>
            </span>
            <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 ${active ? "text-[#0a7c53]" : "text-[#94a3b8]"}`} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d={o.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

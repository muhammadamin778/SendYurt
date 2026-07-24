"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createRemittance } from "@/app/actions/remittance";
import { formatNumber } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { useTransfer } from "@/components/rates/TransferContext";

/**
 * "Confirm & Send" on the Review step. Records a real REMITTANCE via the
 * server action (recomputed server-side) and, when a funding card is selected,
 * debits its balance — declining if the card can't cover the transfer. On
 * success it routes to the dashboard where the new transfer (and the updated
 * card balance) appear.
 */
export function ConfirmTransfer({
  providerId,
  amount,
  currency,
}: {
  providerId: string;
  amount: number;
  currency: string;
}) {
  const t = useTranslations("rates");
  const locale = useLocale();
  const router = useRouter();
  const { selectedCardId, selectedCard, uzsCost, insufficient } = useTransfer();
  const [busy, setBusy] = useState(false);

  function declineToast(balance: number, sending: number) {
    toast(
      t("review.insufficientFunds", {
        balance: formatNumber(balance, locale),
        amount: formatNumber(sending, locale),
      }),
      "error",
    );
  }

  async function onConfirm() {
    // Client-side guard: block submission when the card can't cover it.
    if (insufficient && selectedCard) {
      declineToast(selectedCard.balance, uzsCost);
      return;
    }
    setBusy(true);
    const result = await createRemittance({
      providerId,
      amount,
      currency,
      cardId: selectedCardId ?? undefined,
    });
    if (!result.ok) {
      setBusy(false);
      // Server is authoritative — it re-checks and debits atomically.
      if (result.error === "insufficient_funds" && result.balance != null && result.amount != null) {
        declineToast(result.balance, result.amount);
        return;
      }
      toast(t("review.sendError"), "error");
      return;
    }
    toast(t("review.sendSuccess"));
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col gap-2">
      {insufficient && selectedCard && (
        <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-[#fca5a5] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.5" strokeLinecap="round" />
          </svg>
          <p>
            {t("review.insufficientFunds", {
              balance: formatNumber(selectedCard.balance, locale),
              amount: formatNumber(uzsCost, locale),
            })}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy || insufficient}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-4 text-[16px] font-bold text-white shadow-md shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#0a7c53]"
      >
        {busy ? (
          <>
            <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 3a9 9 0 109 9" strokeLinecap="round" />
            </svg>
            {t("review.sending")}
          </>
        ) : (
          <>
            {t("review.confirmSend")}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => router.push("/rates")}
        disabled={busy}
        className="w-full rounded-xl py-3 text-[14px] font-medium text-[#64748b] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60"
      >
        {t("review.cancel")}
      </button>
    </div>
  );
}

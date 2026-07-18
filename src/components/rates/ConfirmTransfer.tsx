"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createRemittance } from "@/app/actions/remittance";
import { toast } from "@/components/ui/toast";

/**
 * "Confirm & Send" on the Review step. Records a real REMITTANCE via the
 * server action (recomputed server-side), then routes to the dashboard where
 * the new transfer appears in Recent Transactions.
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    setBusy(true);
    const result = await createRemittance({ providerId, amount, currency });
    if (!result.ok) {
      setBusy(false);
      toast(t("review.sendError"), "error");
      return;
    }
    toast(t("review.sendSuccess"));
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-4 text-[16px] font-bold text-white shadow-md shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:opacity-60"
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

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reverseTransaction } from "@/app/actions/budget";
import { toast } from "@/components/ui/toast";
import { reasonCodesFor } from "@/lib/reason-codes";

/**
 * Reverses a transaction. Replaces the old delete button.
 *
 * Deleting is gone: history is append-only, so the row stays visible marked
 * "Reversed" and its amount drops out of every total. A reason code is
 * required — that is what makes the audit trail readable later — so this
 * opens a small dialog rather than a bare confirm().
 */
export function ReverseTransactionButton({ id }: { id: string }) {
  const t = useTranslations("budget");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<string>(reasonCodesFor("REVERSE")[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await reverseTransaction({ id, reasonCode, note: note.trim() || undefined });
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      setNote("");
      toast(t("toast.reversed"));
      router.refresh();
    } else {
      toast(t("form.errorGeneric"), "error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("reverseTransaction")}
        title={t("reverseTransaction")}
        className="rounded p-1.5 text-sand-500 hover:bg-terracotta-50 hover:text-terracotta-700 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 10h11a5 5 0 010 10h-1M3 10l4-4M3 10l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("reverseTransaction")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-[18px] font-bold text-[#0f172a]">{t("reverseTitle")}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748b]">{t("reverseBody")}</p>

            <label className="mt-4 block text-[13px] font-medium text-[#45464d]" htmlFor="reverse-reason">
              {t("reverseReason")}
            </label>
            <select
              id="reverse-reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] px-3.5 py-2.5 text-[14px] text-[#0f172a] outline-none focus:border-[#0a7c53] focus:ring-1 focus:ring-[#0a7c53]"
            >
              {reasonCodesFor("REVERSE").map((code) => (
                <option key={code} value={code}>
                  {t(`reasonCode.${code}`)}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-[13px] font-medium text-[#45464d]" htmlFor="reverse-note">
              {t("reverseNote")}
            </label>
            <textarea
              id="reverse-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={280}
              className="mt-1.5 w-full resize-none rounded-xl border border-[#e2e8f0] px-3.5 py-2.5 text-[14px] text-[#0f172a] outline-none focus:border-[#0a7c53] focus:ring-1 focus:ring-[#0a7c53]"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#64748b] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60"
              >
                {t("form.cancel")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-xl bg-[#b91c1c] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#991b1b] disabled:opacity-60"
              >
                {busy ? t("form.saving") : t("reverseConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

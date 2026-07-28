"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { transitionTransaction } from "@/app/actions/transaction-ops";
import { toast } from "@/components/ui/toast";
import { reasonCodesFor } from "@/lib/reason-codes";
import { availableEvents, type TransactionEventName } from "@/lib/transaction-state";

/**
 * State-gated row actions for the transaction monitor.
 *
 * The buttons rendered come straight from `availableEvents(status)` — the same
 * table the server enforces — so an operator is never offered an action the
 * server would refuse. A terminal row simply shows nothing.
 *
 * Admin-only surface, so copy is English (matching the rest of the panel).
 */

const LABEL: Record<TransactionEventName, string> = {
  CONFIRM: "Confirm",
  FAIL: "Mark failed",
  DISPUTE: "Dispute",
  RESOLVE_VALID: "Resolve — stands",
  RESOLVE_UPHELD: "Resolve — reverse",
  REVERSE: "Reverse",
};

const TONE: Partial<Record<TransactionEventName, string>> = {
  CONFIRM: "text-[#006c49] hover:bg-[#006c49]/10",
  RESOLVE_VALID: "text-[#006c49] hover:bg-[#006c49]/10",
  FAIL: "text-[#ba1a1a] hover:bg-[#ba1a1a]/10",
  REVERSE: "text-[#ba1a1a] hover:bg-[#ba1a1a]/10",
  RESOLVE_UPHELD: "text-[#ba1a1a] hover:bg-[#ba1a1a]/10",
};

export function TransactionRowActions({
  id,
  status,
  allowed,
}: {
  id: string;
  status: string;
  /**
   * Events this viewer may perform. Intersected with what the STATE permits,
   * so a support agent never sees Reverse. The server re-checks both.
   */
  allowed: readonly TransactionEventName[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<TransactionEventName | null>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const permitted = new Set(allowed);
  const events = availableEvents(status).filter((e) => permitted.has(e));
  if (events.length === 0) {
    return <span className="text-[11px] uppercase tracking-wide text-[#6f7a72]">—</span>;
  }

  function open(event: TransactionEventName) {
    setPending(event);
    setReasonCode(reasonCodesFor(event)[0]);
    setNote("");
  }

  async function submit() {
    if (!pending) return;
    setBusy(true);
    const result = await transitionTransaction({
      transactionId: id,
      event: pending,
      reasonCode,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (result.ok) {
      setPending(null);
      toast(`${LABEL[pending]} applied.`);
      router.refresh();
    } else {
      toast(
        result.error === "forbidden"
          ? "You don't have permission for that action."
          : `Could not apply: ${result.error}`,
        "error",
      );
    }
  }

  return (
    <>
      <span className="flex flex-wrap gap-1">
        {events.map((event) => (
          <button
            key={event}
            type="button"
            onClick={() => open(event)}
            className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${TONE[event] ?? "text-[#3f4943] hover:bg-[#e7e8e9]"}`}
          >
            {LABEL[event]}
          </button>
        ))}
      </span>

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={LABEL[pending]}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setPending(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-[18px] font-bold text-[#191c1d]">{LABEL[pending]}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#3f4943]">
              This is recorded in the transition log and the audit trail with your reason.
            </p>

            <label className="mt-4 block text-[13px] font-medium text-[#3f4943]" htmlFor="tx-reason">
              Reason
            </label>
            <select
              id="tx-reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2 text-[14px] text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
            >
              {reasonCodesFor(pending).map((code) => (
                <option key={code} value={code}>
                  {code.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-[13px] font-medium text-[#3f4943]" htmlFor="tx-note">
              Note (optional)
            </label>
            <textarea
              id="tx-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={280}
              className="mt-1.5 w-full resize-none rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2 text-[14px] text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={busy}
                className="rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3f4943] transition-colors hover:bg-[#e7e8e9] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#005136] disabled:opacity-60"
              >
                {busy ? "Applying…" : LABEL[pending]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

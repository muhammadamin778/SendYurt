"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyTrustOverride, revokeTrustOverride } from "@/app/actions/trust-override";
import { toast } from "@/components/ui/toast";
import {
  MAX_OVERRIDE_DELTA,
  MIN_OVERRIDE_REASON_LENGTH,
  OVERRIDE_REASON_CODES,
  effectiveScore,
} from "@/lib/trust-override";

const CODE_LABELS: Record<string, string> = {
  DISPUTE_UPHELD: "Dispute upheld",
  UNRECORDED_HISTORY: "Unrecorded history",
  DATA_CORRECTION: "Data correction",
  GOODWILL: "Goodwill",
  FRAUD_ADJUSTMENT: "Fraud adjustment",
  OTHER: "Other",
};

/**
 * Records or retires a Trust Score adjustment.
 *
 * The preview line is the point of this form: an operator types a delta and
 * immediately sees the resulting score, computed by the same pure function the
 * server uses — including the clamp. Typing +10 against a base of 95 shows 100
 * and says so, rather than being silently discarded on submit.
 */
export function TrustOverrideForm({
  householdId,
  baseScore,
  activeOverride,
}: {
  householdId: string;
  baseScore: number;
  activeOverride: { id: string; delta: number; reasonCode: string; reason: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reasonCode, setReasonCode] = useState<string>(OVERRIDE_REASON_CODES[0]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const parsedDelta = Number(delta);
  const deltaValid =
    delta.trim() !== "" &&
    Number.isInteger(parsedDelta) &&
    parsedDelta !== 0 &&
    Math.abs(parsedDelta) <= MAX_OVERRIDE_DELTA;
  const preview = deltaValid ? effectiveScore(baseScore, parsedDelta) : null;
  const canSubmit = deltaValid && reason.trim().length >= MIN_OVERRIDE_REASON_LENGTH && !busy;

  function report(res: { ok: true } | { ok: false; error: string }, okMsg: string) {
    if (res.ok) {
      toast(okMsg);
      router.refresh();
      return true;
    }
    toast(
      res.error === "forbidden"
        ? "Only a super admin can adjust a Trust Score."
        : res.error === "invalid_delta"
          ? `The adjustment must be a whole number between -${MAX_OVERRIDE_DELTA} and +${MAX_OVERRIDE_DELTA}, and not zero.`
          : res.error === "invalid_reason"
            ? `Give a reason of at least ${MIN_OVERRIDE_REASON_LENGTH} characters.`
            : res.error === "already_revoked"
              ? "That adjustment was already retired."
              : res.error === "read_only_session"
                ? "Exit your view-as session first."
                : "Action failed. Please try again.",
      "error",
    );
    return false;
  }

  async function submit() {
    setBusy(true);
    const res = await applyTrustOverride({ householdId, delta: parsedDelta, reasonCode, reason });
    setBusy(false);
    if (report(res, "Adjustment recorded.")) {
      setOpen(false);
      setDelta("");
      setReason("");
    }
  }

  async function revoke() {
    if (!activeOverride) return;
    setBusy(true);
    const res = await revokeTrustOverride({ overrideId: activeOverride.id });
    setBusy(false);
    report(res, "Adjustment retired — the household is back to its computed score.");
  }

  return (
    <div className="rounded-xl border border-[#bec9c0] bg-white p-4">
      {activeOverride ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#191c1d]">
              Active adjustment{" "}
              <span className={activeOverride.delta > 0 ? "text-[#005136]" : "text-[#ba1a1a]"}>
                {activeOverride.delta > 0 ? "+" : ""}
                {activeOverride.delta}
              </span>{" "}
              <span className="font-normal text-[#6f7a72]">
                ({CODE_LABELS[activeOverride.reasonCode] ?? activeOverride.reasonCode})
              </span>
            </p>
            <p className="mt-1 text-[12px] text-[#3f4943]">{activeOverride.reason}</p>
          </div>
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="shrink-0 rounded-lg border border-[#bec9c0] px-3 py-1.5 text-[12px] font-semibold text-[#3f4943] transition-colors hover:bg-[#e7e8e9] disabled:opacity-40"
          >
            {busy ? "Retiring…" : "Retire adjustment"}
          </button>
        </div>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#3f4943]">
            No adjustment on this household — the score is entirely computed.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-[#006c49] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#005136]"
          >
            Record an adjustment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-[#191c1d]">Record an adjustment</p>
          <p className="text-[12px] leading-relaxed text-[#3f4943]">
            This does not change the computed score. It is stored as a separate, revocable
            entry and shown alongside the base, so an adjusted score stays distinguishable
            from an earned one.
          </p>

          <div className="flex flex-wrap gap-3">
            <label className="flex-1">
              <span className="text-[12px] font-semibold text-[#3f4943]">
                Points (-{MAX_OVERRIDE_DELTA} to +{MAX_OVERRIDE_DELTA})
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                min={-MAX_OVERRIDE_DELTA}
                max={MAX_OVERRIDE_DELTA}
                step={1}
                className="mt-1 w-full rounded-lg border border-[#bec9c0] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
              />
            </label>
            <label className="flex-1">
              <span className="text-[12px] font-semibold text-[#3f4943]">Reason code</span>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#bec9c0] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
              >
                {OVERRIDE_REASON_CODES.map((c) => (
                  <option key={c} value={c}>
                    {CODE_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {preview && (
            <p className="rounded-lg bg-[#f3f4f5] px-3 py-2 text-[12px] tabular-nums text-[#3f4943]">
              {baseScore} computed {parsedDelta > 0 ? "+" : "−"} {Math.abs(parsedDelta)} ={" "}
              <strong className="text-[#191c1d]">{preview.effective}</strong>
              {preview.clamped && (
                <span className="text-[#735c00]">
                  {" "}
                  — capped at {preview.effective === 100 ? "100" : "0"}, so this changes the
                  score by {preview.effective - baseScore} rather than {parsedDelta}.
                </span>
              )}
            </p>
          )}

          <label className="block">
            <span className="text-[12px] font-semibold text-[#3f4943]">
              Reason (shown to the customer if they ask, and recorded in the audit log)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Dispute 118 resolved in their favour — the March remittance was recorded against the wrong household."
              className="mt-1 w-full resize-none rounded-lg border border-[#bec9c0] px-3 py-2 text-[13px] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-lg bg-[#006c49] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#005136] disabled:opacity-40"
            >
              {busy ? "Recording…" : "Record adjustment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

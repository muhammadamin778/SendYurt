"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { contributeToGoal } from "@/app/actions/budget";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/format";

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

export interface GoalLite {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
}

type SourceKey = "remittance" | "card" | "manual";
const SOURCES: { key: SourceKey; labelKey: string; descKey: string; icon: string }[] = [
  { key: "remittance", labelKey: "goalDetail.srcRemittance", descKey: "goalDetail.srcRemittanceDesc", icon: "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z" },
  { key: "card", labelKey: "goalDetail.srcCard", descKey: "goalDetail.srcCardDesc", icon: "M3 6h18v12H3zM3 10h18" },
  { key: "manual", labelKey: "goalDetail.srcManual", descKey: "goalDetail.srcManualDesc", icon: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" },
];

/**
 * Standalone "Add Funds" trigger + modal usable anywhere (e.g. the dashboard).
 * When more than one savings goal exists it shows a goal picker; otherwise it
 * funds the only goal. Wired to the real `contributeToGoal` action.
 */
export function AddFundsButton({ goals, className, label }: { goals: GoalLite[]; className?: string; label?: string }) {
  const t = useTranslations("budget");
  const locale = useLocale();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<SourceKey>("remittance");
  const [manualNote, setManualNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const amt = Math.max(0, parseAmount(amount) || 0);
  const current = goal?.currentAmount ?? 0;
  const target = goal?.targetAmount ?? 0;
  const after = current + amt;
  const pctNow = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const pctAfter = target > 0 ? Math.min(100, (after / target) * 100) : 0;
  const delta = Math.round(pctAfter) - Math.round(pctNow);

  if (goals.length === 0) return null;

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!goal) return;
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t("form.errorAmount"));
      return;
    }
    const note = source === "manual" ? manualNote.trim() || t("goalDetail.srcManual") : t(SOURCES.find((s) => s.key === source)!.labelKey);
    setError(null);
    setBusy(true);
    const result = await contributeToGoal({ goalId: goal.id, amount: amt, note });
    setBusy(false);
    if (!result.ok) {
      setError(t("form.errorGeneric"));
      return;
    }
    toast(t("toast.contributed", { goal: goal.name }));
    setAmount("");
    setManualNote("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex items-center gap-2 rounded-xl bg-[#0a7c53] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#065f3e] active:scale-95"}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
        {label ?? t("goalDetail.addFunds")}
      </button>

      {open && goal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f172a]/25 backdrop-blur-sm md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("goalDetail.addFundsTitle", { goal: goal.name })}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={onConfirm}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-[480px] md:rounded-3xl"
          >
            <div className="flex items-start justify-between px-6 pb-4 pt-8">
              <div>
                <h2 className="text-[24px] font-bold text-[#0a7c53]">{t("goalDetail.addFundsTitle", { goal: goal.name })}</h2>
                <p className="mt-1 text-sm text-[#64748b]">{t("goalDetail.addFundsSubtitle")}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("form.cancel")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto px-6 pb-8">
              {error && <Alert kind="error">{error}</Alert>}

              {/* Goal picker (only when multiple goals) */}
              {goals.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#0f172a]">{t("goalDetail.chooseGoal")}</label>
                  <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 font-semibold text-[#0f172a] outline-none focus:border-[#0a7c53] focus:ring-2 focus:ring-[#0a7c53]/20"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#0f172a]">{t("goalDetail.amountToTransfer")}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-semibold text-[#64748b]">UZS</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500 000"
                    className="w-full rounded-xl border border-[#e2e8f0] bg-white py-4 pl-16 pr-4 text-[18px] font-semibold text-[#0f172a] outline-none transition-all focus:border-[#0a7c53] focus:ring-2 focus:ring-[#0a7c53]/20"
                  />
                </div>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#0f172a]">{t("goalDetail.source")}</label>
                <div className="space-y-2">
                  {SOURCES.map((s) => {
                    const active = source === s.key;
                    return (
                      <button
                        type="button"
                        key={s.key}
                        onClick={() => setSource(s.key)}
                        className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors ${active ? "border-2 border-[#0a7c53] bg-[#0a7c53]/10" : "border border-[#e2e8f0] bg-white hover:bg-[#f8fafc]"}`}
                      >
                        <span className={`grid h-10 w-10 place-items-center rounded-lg border ${active ? "border-[#0a7c53]/30 text-[#0a7c53]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={s.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <span className="flex-1">
                          <span className="block font-bold text-[#0f172a]">{t(s.labelKey)}</span>
                          <span className="block text-sm text-[#64748b]">{t(s.descKey)}</span>
                        </span>
                        {active ? (
                          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0a7c53]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : (
                          <span className="h-6 w-6 rounded-full border-2 border-[#cbd5e1]" />
                        )}
                      </button>
                    );
                  })}
                  {source === "manual" && (
                    <Input label={t("goalDetail.fundsNote")} value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder={t("goalDetail.fundsNotePlaceholder")} />
                  )}
                </div>
              </div>

              {/* Goal impact */}
              <div className="space-y-4 rounded-2xl bg-[#f1f5f9] p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">{t("goalDetail.goalImpact")}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b]">{t("goalDetail.currentProgress")}</span>
                  <div className="text-right">
                    <p className="font-bold text-[#0f172a]">{formatMoney(current, "UZS", locale)}</p>
                    <p className="text-sm text-[#64748b]">{t("goalDetail.achieved", { percent: Math.round(pctNow) })}</p>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e0e3e5]">
                  <div className="absolute inset-y-0 left-0 z-10 rounded-full bg-[#94a3b8]" style={{ width: `${pctNow}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[#4edea3] transition-[width]" style={{ width: `${pctAfter}%` }} />
                </div>
                <div className="flex items-center justify-between border-t border-[#cbd5e1]/50 pt-2">
                  <span className="font-bold text-[#0f172a]">{t("goalDetail.afterTransfer")}</span>
                  <div className="text-right">
                    <p className="font-bold text-[#0a7c53]">{formatMoney(after, "UZS", locale)}</p>
                    <p className="text-sm font-bold text-[#0a7c53]">
                      {delta > 0 ? t("goalDetail.achievedDelta", { percent: Math.round(pctAfter), delta }) : t("goalDetail.achieved", { percent: Math.round(pctAfter) })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust nudge */}
              <div className="flex items-center gap-3 rounded-xl border border-[#ffddb8] bg-[#ffddb8]/30 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffddb8] text-[#b87500]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.6 6.1 20l1.2-6.5L2.5 8.9 9.1 8z" /></svg>
                </span>
                <p className="text-sm leading-tight text-[#7a5a1e]">{t("goalDetail.trustNudge")}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-1">
                <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#0a7c53] py-4 text-[18px] font-semibold text-white shadow-lg shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-95 disabled:opacity-60">
                  {t("goalDetail.confirmTransfer")}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="w-full rounded-xl py-3 text-sm font-medium text-[#64748b] transition-colors hover:bg-[#f1f5f9]">
                  {t("form.cancel")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

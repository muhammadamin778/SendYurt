"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { addSavingsGoal } from "@/app/actions/budget";
import { toast } from "@/components/ui/toast";

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

const fieldCls =
  "w-full h-14 px-4 bg-white border border-[#c6c6cd] rounded-xl text-[#191c1e] transition-all placeholder:text-[#7e7576] focus:outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]";

/** New Savings Goal form — the left card of the design. */
export function NewGoalForm() {
  const t = useTranslations("budget");
  const router = useRouter();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const value = parseAmount(target);
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = t("goals.errorName");
    if (!Number.isFinite(value) || value <= 0) next.target = t("form.errorAmount");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const result = await addSavingsGoal({
      name: name.trim(),
      targetAmount: value,
      targetDate: targetDate || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(t("form.errorGeneric"));
      return;
    }
    toast(t("toast.goalCreated", { goal: name.trim() }));
    router.push("/budget/manage");
  }

  return (
    <div className="rounded-[32px] border border-[#c6c6cd] bg-white p-8 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {formError && (
          <p role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-4 py-3 text-[13px] font-medium text-[#93000a]">
            {formError}
          </p>
        )}

        {/* Goal Name */}
        <div className="space-y-2">
          <label htmlFor="goal-name" className="text-[14px] font-medium text-[#45464d]">{t("newGoal.goalName")}</label>
          <div className="relative">
            <input
              id="goal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("goals.namePlaceholder")}
              className={`${fieldCls} pr-12`}
            />
            <svg viewBox="0 0 24 24" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7e7576]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 21V4h11l-1.5 3L15 10H6M4 21H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {errors.name && <p className="text-[12px] font-medium text-[#93000a]">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Target Amount */}
          <div className="space-y-2">
            <label htmlFor="target-amount" className="text-[14px] font-medium text-[#45464d]">{t("newGoal.targetAmount")}</label>
            <div className="relative">
              <input
                id="target-amount"
                type="text"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0.00"
                className={`${fieldCls} pr-16`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold tracking-wide text-[#006c49]">UZS</span>
            </div>
            {errors.target && <p className="text-[12px] font-medium text-[#93000a]">{errors.target}</p>}
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <label htmlFor="target-date" className="text-[14px] font-medium text-[#45464d]">{t("newGoal.targetDate")}</label>
            <input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={fieldCls}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#006c49] px-8 text-[16px] font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 4h11l3 3v13H5zM8 4v5h7M8 20v-6h8v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            {t("newGoal.saveGoal")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/budget/manage")}
            className="h-14 w-full rounded-xl border-2 border-[#191c1e] px-8 text-[16px] font-semibold text-[#191c1e] transition-all hover:bg-[#f2f4f6] active:scale-95 sm:w-auto"
          >
            {t("form.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

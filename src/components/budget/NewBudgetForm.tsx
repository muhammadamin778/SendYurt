"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { setBudget } from "@/app/actions/budget";
import { toast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/categories";

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

const controlCls =
  "w-full rounded-xl border border-[#c6c6cd] bg-white px-4 py-4 text-[16px] text-[#191c1e] transition-all focus:outline-none focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]";

/** Set Category Budget form — the left card of the design. */
export function NewBudgetForm({
  period,
  initialCategory,
}: {
  period: string;
  initialCategory: string;
}) {
  const t = useTranslations("budget");
  const router = useRouter();

  const [category, setCategory] = useState(initialCategory);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError(t("form.errorAmount"));
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await setBudget({ category, amountAllocated: value, period });
    setSubmitting(false);
    if (!result.ok) {
      setError(t("form.errorGeneric"));
      return;
    }
    toast(t("toast.budgetSet", { category: t(`categories.${category}`) }));
    router.push("/budget/manage");
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#c6c6cd] bg-white p-6 shadow-sm">
      {/* Header accent bar */}
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#006c49] to-[#9df4c8]" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-[24px] font-bold text-[#191c1e] md:text-[32px] md:tracking-[-0.02em]">{t("newBudget.title")}</h1>
          <p className="text-[#45464d]">{t("newBudget.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/budget/manage")}
          className="rounded-lg border-2 border-[#191c1e] px-4 py-2 text-[14px] font-medium text-[#191c1e] transition-all hover:bg-[#f2f4f6]"
        >
          {t("newBudget.close")}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Category */}
          <div className="flex flex-col gap-2">
            <label htmlFor="budget-category" className="flex items-center gap-1 text-[14px] font-medium text-[#45464d]">
              {t("newBudget.category")}
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#b37723]" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20 8 13.3 2 8.9h7.6z" /></svg>
            </label>
            <div className="relative">
              <select
                id="budget-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${controlCls} cursor-pointer appearance-none pr-10`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7e7576]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>

          {/* Monthly limit */}
          <div className="flex flex-col gap-2">
            <label htmlFor="budget-limit" className="flex items-center gap-1 text-[14px] font-medium text-[#45464d]">
              {t("newBudget.monthlyLimit")}
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#b37723]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </label>
            <div className="relative">
              <input
                id="budget-limit"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5,000,000"
                className={`${controlCls} pr-16`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold tracking-wide text-[#45464d]">UZS</span>
            </div>
            {error && <p className="text-[12px] font-medium text-[#93000a]">{error}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 pt-2 md:flex-row">
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006c49] px-12 py-4 text-[20px] font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 md:w-auto"
            style={{ boxShadow: "0 10px 25px -5px rgba(0, 108, 73, 0.2)" }}
          >
            {submitting ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></svg>
            )}
            {t("newBudget.saveBudget")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/budget/manage")}
            className="w-full px-12 py-4 text-[14px] font-medium text-[#45464d] transition-colors hover:text-[#191c1e] md:w-auto"
          >
            {t("form.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

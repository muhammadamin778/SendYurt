"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { addExpense, addIncome } from "@/app/actions/budget";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/categories";
import { useBudgetUi } from "./store";

function todayLocalIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function AddTransactionButton() {
  const t = useTranslations("budget");
  const togglePanel = useBudgetUi((s) => s.togglePanel);
  const open = useBudgetUi((s) => s.panel === "transaction");

  return (
    <Button
      variant={open ? "secondary" : "primary"}
      onClick={() => togglePanel("transaction")}
      aria-expanded={open}
    >
      {open ? t("form.close") : t("form.addTransaction")}
    </Button>
  );
}

export function TransactionForm() {
  const t = useTranslations("budget");
  const locale = useLocale();
  const router = useRouter();
  const open = useBudgetUi((s) => s.panel === "transaction");
  const setPanel = useBudgetUi((s) => s.setPanel);

  const [kind, setKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocalIso());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const value = Number(amount.replace(/\s/g, "").replace(",", "."));
    const nextErrors: Record<string, string> = {};
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = t("form.errorAmount");
    if (!date || Number.isNaN(new Date(date).getTime())) nextErrors.date = t("form.errorDate");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const payload = { amount: value, note: note.trim() || undefined, date };
    const result =
      kind === "EXPENSE"
        ? await addExpense({ ...payload, category })
        : await addIncome(payload);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(t("form.errorGeneric"));
      return;
    }
    setAmount("");
    setNote("");
    setPanel("none");
    toast(t("toast.saved"));
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-4 rounded-xl border border-sand-200 bg-white p-5 shadow-card"
      noValidate
    >
      {formError && <Alert kind="error">{formError}</Alert>}

      <div role="radiogroup" aria-label={t("form.typeLabel")} className="flex gap-2">
        {(["EXPENSE", "INCOME"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              kind === k
                ? "bg-samarkand-700 text-white"
                : "bg-sand-100 text-sand-900 hover:bg-sand-200",
            )}
          >
            {t(`form.kind.${k}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`${t("form.amount")} (UZS)`}
          name="amount"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        {kind === "EXPENSE" && (
          <Select
            label={t("form.category")}
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </Select>
        )}
        <Input
          label={t("form.date")}
          name="date"
          type="date"
          required
          lang={locale}
          value={date}
          max={todayLocalIso()}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        <Input
          label={t("form.note")}
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("form.notePlaceholder")}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          {t("form.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setPanel("none")}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveUsualPreference } from "@/app/actions/preferences";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/toast";

export function RateForm({
  currencies,
  initialAmount,
  initialCurrency,
  isUsual,
}: {
  currencies: string[];
  initialAmount: number;
  initialCurrency: string;
  /** True when the current values already match the saved "usual". */
  isUsual: boolean;
}) {
  const t = useTranslations("rates");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(initialAmount));
  const [currency, setCurrency] = useState(initialCurrency);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNow, setSavedNow] = useState(false);

  async function onSaveUsual() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
      setError(t("errorAmountPositive"));
      return;
    }
    setSaving(true);
    const result = await saveUsualPreference({ amount: value, currency });
    setSaving(false);
    if (result.ok) {
      setSavedNow(true);
      toast(t("usualSaved"));
      router.refresh();
    } else {
      toast(t("errorGeneric"), "error");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("errorAmountPositive"));
      return;
    }
    if (value > 1_000_000) {
      setError(t("errorAmountTooLarge"));
      return;
    }
    setError(null);
    startTransition(() => {
      router.replace({
        pathname: "/rates",
        query: { amount: String(value), currency },
      });
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      noValidate
    >
      <Input
        label={t("amountLabel")}
        name="amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error ?? undefined}
        className="flex-1"
      />
      <Select
        label={t("currencyLabel")}
        name="currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="sm:w-36"
      >
        {currencies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-2 sm:flex-row sm:pt-[26px]">
        <Button type="submit" loading={isPending} full className="sm:w-auto">
          {t("compareButton")}
        </Button>
        {isUsual || savedNow ? (
          <span className="inline-flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold text-samarkand-700">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("usualBadge")}
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            loading={saving}
            onClick={onSaveUsual}
            full
            className="sm:w-auto"
          >
            {t("saveUsual")}
          </Button>
        )}
      </div>
    </form>
  );
}

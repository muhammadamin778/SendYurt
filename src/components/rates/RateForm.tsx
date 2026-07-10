"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function RateForm({
  currencies,
  initialAmount,
  initialCurrency,
}: {
  currencies: string[];
  initialAmount: number;
  initialCurrency: string;
}) {
  const t = useTranslations("rates");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(initialAmount));
  const [currency, setCurrency] = useState(initialCurrency);
  const [error, setError] = useState<string | null>(null);

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
      <div className="sm:pt-[26px]">
        <Button type="submit" loading={isPending} full className="sm:w-auto">
          {t("compareButton")}
        </Button>
      </div>
    </form>
  );
}

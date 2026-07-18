"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { contributeToGoal } from "@/app/actions/budget";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "@/components/ui/toast";
import { formatDate, formatMoney } from "@/lib/format";

export interface GoalProps {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDateIso: string | null;
}

/**
 * Savings goal with an optimistic contribution flow: the bar and totals
 * move the instant the family adds money; the server result then either
 * confirms (silent) or reverts with an error toast.
 */
export function GoalCard({ goal, canEdit = true }: { goal: GoalProps; canEdit?: boolean }) {
  const t = useTranslations("budget");
  const locale = useLocale();
  const router = useRouter();

  const [current, setCurrent] = useState(goal.currentAmount);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pct = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0;

  async function onContribute(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("form.errorAmount"));
      return;
    }
    setError(null);

    // Optimistic: reflect the deposit immediately.
    const before = current;
    setCurrent(before + value);
    setAmount("");
    setSubmitting(true);

    const result = await contributeToGoal({ goalId: goal.id, amount: value });
    setSubmitting(false);

    if (!result.ok) {
      setCurrent(before); // revert
      toast(t("form.errorGeneric"), "error");
      return;
    }
    toast(t("toast.contributed", { goal: goal.name }));
    router.refresh();
  }

  return (
    <Card accent={pct >= 100} className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/budget/goals/${goal.id}`}
          className="font-semibold text-ink underline-offset-2 hover:underline dark:text-white"
        >
          {goal.name}
        </Link>
        <span className="text-sm font-bold text-samarkand-800 dark:text-samarkand-300">
          {Math.min(100, Math.round(pct))}%
        </span>
      </div>
      <ProgressBar className="mt-3" value={current} max={goal.targetAmount} label={goal.name} />
      <p className="mt-2 text-xs text-sand-700 dark:text-night-soft">
        {formatMoney(current, "UZS", locale)} / {formatMoney(goal.targetAmount, "UZS", locale)}
        {goal.targetDateIso && (
          <> · {t("goals.by", { date: formatDate(new Date(goal.targetDateIso), locale) })}</>
        )}
      </p>
      {pct < 100 && canEdit && (
        <form onSubmit={onContribute} className="mt-3 flex items-start gap-2" noValidate>
          <Input
            label={t("goals.contribute")}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={error ?? undefined}
            placeholder="100 000"
            className="flex-1 [&_label]:sr-only"
          />
          <Button type="submit" variant="secondary" loading={submitting} className="shrink-0">
            {t("goals.contributeButton")}
          </Button>
        </form>
      )}
    </Card>
  );
}

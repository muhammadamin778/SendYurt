"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { addSavingsGoal, contributeToGoal, setBudget } from "@/app/actions/budget";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CATEGORIES } from "@/lib/categories";
import { useBudgetUi } from "./store";

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

export function EditBudgetButton() {
  const t = useTranslations("budget");
  const togglePanel = useBudgetUi((s) => s.togglePanel);
  const open = useBudgetUi((s) => s.panel === "budget");
  return (
    <Button variant="secondary" onClick={() => togglePanel("budget")} aria-expanded={open}>
      {open ? t("form.close") : t("allocations.edit")}
    </Button>
  );
}

export function SetBudgetForm({ period }: { period: string }) {
  const t = useTranslations("budget");
  const router = useRouter();
  const open = useBudgetUi((s) => s.panel === "budget");
  const setPanel = useBudgetUi((s) => s.setPanel);

  const [category, setCategory] = useState<string>("food");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

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
    setAmount("");
    setPanel("none");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-4 rounded-xl border border-sand-200 bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      noValidate
    >
      <Select
        label={t("form.category")}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t(`categories.${c}`)}
          </option>
        ))}
      </Select>
      <Input
        label={`${t("allocations.monthlyLimit")} (UZS)`}
        inputMode="decimal"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error ?? undefined}
      />
      <Button type="submit" loading={submitting}>
        {t("form.save")}
      </Button>
    </form>
  );
}

export function AddGoalButton() {
  const t = useTranslations("budget");
  const togglePanel = useBudgetUi((s) => s.togglePanel);
  const open = useBudgetUi((s) => s.panel === "goal");
  return (
    <Button variant="secondary" onClick={() => togglePanel("goal")} aria-expanded={open}>
      {open ? t("form.close") : t("goals.add")}
    </Button>
  );
}

export function AddGoalForm() {
  const t = useTranslations("budget");
  const router = useRouter();
  const open = useBudgetUi((s) => s.panel === "goal");
  const setPanel = useBudgetUi((s) => s.setPanel);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const value = parseAmount(target);
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = t("goals.errorName");
    if (!Number.isFinite(value) || value <= 0) nextErrors.target = t("form.errorAmount");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
    setName("");
    setTarget("");
    setTargetDate("");
    setPanel("none");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-4 rounded-xl border border-sand-200 bg-white p-5 shadow-card"
      noValidate
    >
      {formError && <Alert kind="error">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("goals.name")}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder={t("goals.namePlaceholder")}
        />
        <Input
          label={`${t("goals.target")} (UZS)`}
          inputMode="decimal"
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target}
        />
        <Input
          label={t("goals.targetDate")}
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
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

export function ContributeForm({ goalId }: { goalId: string }) {
  const t = useTranslations("budget");
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("form.errorAmount"));
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await contributeToGoal({ goalId, amount: value });
    setSubmitting(false);
    if (!result.ok) {
      setError(t("form.errorGeneric"));
      return;
    }
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-start gap-2" noValidate>
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
  );
}

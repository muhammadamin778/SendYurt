import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  AddGoalButton,
  AddGoalForm,
  EditBudgetButton,
  SetBudgetForm,
} from "@/components/budget/BudgetForms";
import { GoalCard } from "@/components/budget/GoalCard";
import { DeleteTransactionButton } from "@/components/budget/DeleteTransactionButton";
import { SpendSaveChart } from "@/components/budget/SpendSaveChart";
import {
  AddTransactionButton,
  TransactionForm,
} from "@/components/budget/TransactionForm";
import {
  currentPeriod,
  getCategorySpend,
  getMonthlyTrend,
  getMonthSummary,
  getSavingsGoals,
  getTransactions,
  isValidPeriod,
  periodRange,
  shiftPeriod,
} from "@/lib/budget-data";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "budget" });
  return { title: t("title") };
}

const TYPE_STYLES: Record<string, { sign: string; className: string }> = {
  INCOME: { sign: "+", className: "text-samarkand-700" },
  REMITTANCE: { sign: "+", className: "text-samarkand-700" },
  EXPENSE: { sign: "−", className: "text-terracotta-800" },
  SAVINGS: { sign: "→", className: "text-sand-900" },
};

export default async function BudgetPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { month?: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("budget");
  const currentLocale = await getLocale();

  const period =
    searchParams.month && isValidPeriod(searchParams.month)
      ? searchParams.month
      : currentPeriod();
  const isCurrentMonth = period === currentPeriod();

  const [summary, trend, categories, transactions, goals] = await Promise.all([
    getMonthSummary(user.householdId, period),
    getMonthlyTrend(user.householdId, period, 6),
    getCategorySpend(user.householdId, period),
    getTransactions(user.householdId, period),
    getSavingsGoals(user.householdId),
  ]);

  const monthLabel = new Intl.DateTimeFormat(
    currentLocale === "uz" ? "uz-UZ" : currentLocale === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" },
  ).format(periodRange(period).start);

  const hasDemoRows = transactions.some((tx) => tx.isDemo);

  return (
    <div className="space-y-8">
      {/* Header + month navigation */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sand-800">{t("subtitle")}</p>
        </div>
        <nav aria-label={t("monthNav")} className="flex items-center gap-2">
          <Link
            href={{ pathname: "/budget", query: { month: shiftPeriod(period, -1) } }}
            aria-label={t("prevMonth")}
            className="rounded-lg border border-sand-300 bg-white p-2 text-sand-800 hover:bg-sand-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold capitalize text-ink">
            {monthLabel}
          </span>
          <Link
            href={{ pathname: "/budget", query: { month: shiftPeriod(period, 1) } }}
            aria-label={t("nextMonth")}
            aria-disabled={isCurrentMonth}
            tabIndex={isCurrentMonth ? -1 : undefined}
            className={
              isCurrentMonth
                ? "pointer-events-none rounded-lg border border-sand-200 bg-sand-100 p-2 text-sand-400"
                : "rounded-lg border border-sand-300 bg-white p-2 text-sand-800 hover:bg-sand-100"
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </nav>
      </div>

      {/* Month summary */}
      <section aria-label={t("summaryLabel")} className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-sand-700">
            {t("summary.income")}
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-samarkand-800 sm:text-2xl">
            {formatMoney(summary.incomeUzs, "UZS", currentLocale)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-sand-700">
            {t("summary.spent")}
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-terracotta-800 sm:text-2xl">
            {formatMoney(summary.spentUzs, "UZS", currentLocale)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-sand-700">
            {t("summary.saved")}
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-samarkand-950 sm:text-2xl">
            {formatMoney(summary.savedUzs, "UZS", currentLocale)}
          </div>
        </Card>
      </section>

      {/* Trend chart */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("chart.title")}
        </h2>
        <div className="mt-4">
          <SpendSaveChart
            points={trend.map((p) => ({
              period: p.period,
              monthStartIso: p.monthStart.toISOString(),
              incomeUzs: p.incomeUzs,
              spentUzs: p.spentUzs,
              savedUzs: p.savedUzs,
            }))}
          />
        </div>
      </Card>

      {/* Category budgets */}
      <section aria-label={t("allocations.title")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-samarkand-950">
            {t("allocations.title")}
          </h2>
          <EditBudgetButton />
        </div>
        <SetBudgetForm period={period} />
        {categories.length === 0 ? (
          <div className="mt-4">
            <EmptyState>{t("allocations.empty")}</EmptyState>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {categories.map((c) => {
              const over = c.allocatedUzs !== null && c.spentUzs > c.allocatedUzs;
              return (
                <Card key={c.category} className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {t(`categories.${c.category}`)}
                    </span>
                    <span className="text-xs text-sand-700">
                      {formatMoney(c.spentUzs, "UZS", currentLocale)}
                      {c.allocatedUzs !== null && (
                        <> / {formatMoney(c.allocatedUzs, "UZS", currentLocale)}</>
                      )}
                    </span>
                  </div>
                  {c.allocatedUzs !== null ? (
                    <>
                      <ProgressBar
                        className="mt-2"
                        value={c.spentUzs}
                        max={c.allocatedUzs}
                        label={t(`categories.${c.category}`)}
                        danger={over}
                      />
                      {over && (
                        <p className="mt-1.5 text-xs font-medium text-terracotta-700">
                          {t("allocations.over", {
                            amount: formatMoney(
                              c.spentUzs - c.allocatedUzs,
                              "UZS",
                              currentLocale,
                            ),
                          })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-sand-600">
                      {t("allocations.noLimit")}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Savings goals */}
      <section aria-label={t("goals.title")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-samarkand-950">
            {t("goals.title")}
          </h2>
          <AddGoalButton />
        </div>
        <AddGoalForm />
        {goals.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-samarkand-300" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              }
            >
              {t("goals.empty")}
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={{
                  id: g.id,
                  name: g.name,
                  targetAmount: g.targetAmount,
                  currentAmount: g.currentAmount,
                  targetDateIso: g.targetDate?.toISOString() ?? null,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Transactions */}
      <section aria-label={t("transactions.title")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-samarkand-950">
            {t("transactions.title")}
          </h2>
          <AddTransactionButton />
        </div>
        <TransactionForm />
        {hasDemoRows && (
          <p className="mt-3 text-xs text-sand-700">
            <span className="mr-1 rounded bg-sand-200 px-1.5 py-0.5 font-semibold">
              {t("transactions.demoBadge")}
            </span>
            {t("transactions.demoNote")}
          </p>
        )}
        {transactions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-samarkand-300" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 10h18M7 15h4" strokeLinecap="round" />
                </svg>
              }
            >
              {t("transactions.empty")}
            </EmptyState>
          </div>
        ) : (
          <Card className="mt-4 divide-y divide-sand-100">
            {transactions.map((tx) => {
              const style = TYPE_STYLES[tx.type] ?? TYPE_STYLES.EXPENSE;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-ink">
                        {tx.type === "EXPENSE" && tx.category
                          ? t(`categories.${tx.category}`)
                          : t(`transactions.type.${tx.type}`)}
                      </span>
                      {tx.isDemo && (
                        <span className="rounded bg-sand-200 px-1.5 py-0.5 text-[10px] font-semibold text-sand-800">
                          {t("transactions.demoBadge")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-sand-700">
                      {formatDate(tx.date, currentLocale)}
                      {tx.providerName && <> · {tx.providerName}</>}
                      {tx.sourceAmount && tx.sourceCurrency && (
                        <> · {formatMoney(tx.sourceAmount, tx.sourceCurrency, currentLocale)}</>
                      )}
                      {tx.note && <> · {tx.note}</>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${style.className}`}>
                    {style.sign}
                    {formatMoney(tx.amount, tx.currency, currentLocale)}
                  </span>
                  <DeleteTransactionButton id={tx.id} />
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

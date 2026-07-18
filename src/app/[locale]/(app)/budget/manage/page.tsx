import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BankCreditCard } from "@/components/bank/BankCreditCard";
import { BankExpensePie, BankGroupedBars } from "@/components/bank/charts";
import {
  AddGoalButton,
  AddGoalForm,
  EditBudgetButton,
  SetBudgetForm,
} from "@/components/budget/BudgetForms";
import { GoalCard } from "@/components/budget/GoalCard";
import { DeleteTransactionButton } from "@/components/budget/DeleteTransactionButton";
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
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "budget" });
  return { title: t("title") };
}

const TX_META: Record<string, { grad: string; icon: string; sign: string; tone: string }> = {
  INCOME: { grad: "from-[#dcfce7] to-[#bbf7d0]", icon: "M12 3v18m6-12l-6-6-6 6", sign: "+", tone: "text-[#059669]" },
  REMITTANCE: { grad: "from-[#d1fae5] to-[#d1fae5]", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", sign: "+", tone: "text-[#059669]" },
  EXPENSE: { grad: "from-[#fff1e0] to-[#ffe6cf]", icon: "M3 6h18v13a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18", sign: "−", tone: "text-[#ef4444]" },
  SAVINGS: { grad: "from-[#dcfce7] to-[#bbf7d0]", icon: "M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4", sign: "→", tone: "text-[#0f172a]" },
};

function StatCard({
  label,
  value,
  chip,
  icon,
}: {
  label: string;
  value: string;
  chip: string;
  icon: string;
}) {
  return (
    <div className="bank-card flex items-center gap-4 px-5 py-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${chip}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-[#64748b]">{label}</p>
        <p className="mt-1 truncate text-[22px] font-bold tabular-nums text-[#0f172a]">{value}</p>
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold text-[#0f172a]">{title}</h2>
        {action}
      </div>
      <div className={`bank-card ${bodyClassName}`}>{children}</div>
    </section>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#0f172a] transition-colors hover:bg-[#f1f5f9]";

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
  const tb = await getTranslations("bank");
  const currentLocale = await getLocale();

  const period =
    searchParams.month && isValidPeriod(searchParams.month) ? searchParams.month : currentPeriod();
  const isCurrentMonth = period === currentPeriod();

  const [summary, trend, categories, transactions, goals, household] = await Promise.all([
    getMonthSummary(user.householdId, period),
    getMonthlyTrend(user.householdId, period, 6),
    getCategorySpend(user.householdId, period),
    getTransactions(user.householdId, period),
    getSavingsGoals(user.householdId),
    prisma.household.findUnique({ where: { id: user.householdId }, select: { name: true, inviteCode: true } }),
  ]);

  const monthLabel = new Intl.DateTimeFormat(
    currentLocale === "uz" ? "uz-UZ" : currentLocale === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" },
  ).format(periodRange(period).start);

  const hasDemoRows = transactions.some((tx) => tx.isDemo);
  const canEdit = user.accessRole === "ADMIN";
  const balance = summary.incomeUzs - summary.spentUzs;

  const barData = trend.map((p) => ({
    name: formatMonth(p.monthStart, currentLocale),
    primary: p.incomeUzs,
    secondary: p.spentUzs,
  }));

  const pieSlices = categories
    .filter((c) => c.spentUzs > 0)
    .sort((a, b) => b.spentUzs - a.spentUzs)
    .slice(0, 5)
    .map((c) => ({ label: t(`categories.${c.category}`), value: c.spentUzs }));

  const code = household?.inviteCode ?? "00000000";
  const now = new Date();
  const validThru = `${String(now.getMonth() + 1).padStart(2, "0")}/${String((now.getFullYear() + 4) % 100).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      {/* Header + month navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold text-[#0f172a]">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/summary"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-sm font-semibold text-[#0f172a] transition-colors hover:bg-[#f1f5f9]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("downloadSummary")}
          </Link>
          <nav aria-label={t("monthNav")} className="flex items-center gap-2">
            <Link href={{ pathname: "/budget/manage", query: { month: shiftPeriod(period, -1) } }} aria-label={t("prevMonth")} className={iconBtn}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <span className="min-w-36 text-center text-sm font-semibold capitalize text-[#0f172a]">{monthLabel}</span>
            <Link
              href={{ pathname: "/budget/manage", query: { month: shiftPeriod(period, 1) } }}
              aria-label={t("nextMonth")}
              aria-disabled={isCurrentMonth}
              tabIndex={isCurrentMonth ? -1 : undefined}
              className={isCurrentMonth ? "pointer-events-none inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#eef2f7] bg-[#f7f9fb] text-[#cbd5e1]" : iconBtn}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </nav>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tb("myBalance")} value={formatMoney(balance, "UZS", currentLocale)} chip="bg-[#fff5d9] text-[#f5b544]" icon="M3 7h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l3-4h12l3 4M12 12h.01" />
        <StatCard label={tb("income")} value={formatMoney(summary.incomeUzs, "UZS", currentLocale)} chip="bg-[#dcfce7] text-[#0a7c53]" icon="M12 3v18m6-12l-6-6-6 6" />
        <StatCard label={tb("expense")} value={formatMoney(summary.spentUzs, "UZS", currentLocale)} chip="bg-[#fee2e2] text-[#ef4444]" icon="M12 21V3m6 12l-6 6-6-6" />
        <StatCard label={tb("totalSaving")} value={formatMoney(summary.savedUzs, "UZS", currentLocale)} chip="bg-[#d1fae5] text-[#059669]" icon="M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4z" />
      </div>

      {/* Overview chart + card */}
      <div className="grid gap-7 xl:grid-cols-3">
        <Card
          title={tb("debitCreditOverview")}
          className="xl:col-span-2"
          bodyClassName="px-5 py-6"
          action={
            <div className="flex items-center gap-5 text-[13px]">
              <span className="flex items-center gap-2 text-[#64748b]"><span className="h-3 w-3 rounded-full bg-[#0a7c53]" />{t("summary.income")}</span>
              <span className="flex items-center gap-2 text-[#64748b]"><span className="h-3 w-3 rounded-full bg-[#34d399]" />{t("summary.spent")}</span>
            </div>
          }
        >
          <BankGroupedBars data={barData} primaryColor="#0a7c53" secondaryColor="#34d399" ariaLabel={tb("debitCreditOverview")} />
        </Card>

        <Card title={tb("myCard")} bodyClassName="!bg-transparent !shadow-none">
          <BankCreditCard
            variant="filled"
            balanceLabel={tb("totalSaving")}
            balance={formatMoney(summary.savedUzs, "UZS", currentLocale)}
            holderLabel={tb("cardHolder")}
            holder={household?.name ?? user.name ?? "—"}
            validLabel={tb("validThru")}
            valid={validThru}
            number={`•••• •••• •••• ${code.slice(-4)}`}
          />
        </Card>
      </div>

      {/* Transactions + expense pie */}
      <div className="grid gap-7 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold text-[#0f172a]">{tb("lastTransaction")}</h2>
            {canEdit && <AddTransactionButton />}
          </div>
          {canEdit && <TransactionForm />}
          {!canEdit && <p className="mb-3 text-xs text-[#94a3b8]">{t("viewerNote")}</p>}
          {hasDemoRows && (
            <p className="mb-3 flex items-center gap-2 text-xs text-[#94a3b8]">
              <Badge variant="muted">{t("transactions.demoBadge")}</Badge>
              {t("transactions.demoNote")}
            </p>
          )}
          <div className="bank-card px-5 py-2">
            {transactions.length === 0 ? (
              <div className="py-8"><EmptyState>{t("transactions.empty")}</EmptyState></div>
            ) : (
              transactions.map((tx) => {
                const meta = TX_META[tx.type] ?? TX_META.EXPENSE;
                const label =
                  tx.type === "EXPENSE" && tx.category
                    ? t(`categories.${tx.category}`)
                    : t(`transactions.type.${tx.type}`);
                return (
                  <div key={tx.id} className="flex items-center gap-4 border-b border-[#f1f5f9] py-3.5 last:border-0">
                    <span className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.grad}`}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0f172a]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d={meta.icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="truncate text-[15px] font-semibold text-[#0f172a]">{label}</span>
                        {tx.isDemo && <Badge variant="muted" className="text-[10px]">{t("transactions.demoBadge")}</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-[#94a3b8]">
                        {formatDate(tx.date, currentLocale)}
                        {tx.providerName && <> · {tx.providerName}</>}
                        {tx.note && <> · {tx.note}</>}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[15px] font-bold tabular-nums ${meta.tone}`}>
                      {meta.sign}
                      {formatMoney(tx.amount, tx.currency, currentLocale)}
                    </span>
                    {canEdit && <DeleteTransactionButton id={tx.id} />}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <Card title={tb("expenseStatistics")} bodyClassName="px-3 py-4">
          {pieSlices.length > 0 ? (
            <BankExpensePie slices={pieSlices} ariaLabel={tb("expenseStatistics")} />
          ) : (
            <p className="py-16 text-center text-sm text-[#64748b]">{t("pie.empty")}</p>
          )}
        </Card>
      </div>

      {/* Category budgets */}
      <section aria-label={t("allocations.title")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[#0f172a]">{t("allocations.title")}</h2>
          {canEdit && <EditBudgetButton />}
        </div>
        {canEdit && <SetBudgetForm period={period} />}
        {categories.length === 0 ? (
          <div className="bank-card p-8"><EmptyState>{t("allocations.empty")}</EmptyState></div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {categories.map((c) => {
              const over = c.allocatedUzs !== null && c.spentUzs > c.allocatedUzs;
              return (
                <div key={c.category} className="bank-card p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold text-[#0f172a]">{t(`categories.${c.category}`)}</span>
                    <span className="text-xs tabular-nums text-[#64748b]">
                      {formatMoney(c.spentUzs, "UZS", currentLocale)}
                      {c.allocatedUzs !== null && <> / {formatMoney(c.allocatedUzs, "UZS", currentLocale)}</>}
                    </span>
                  </div>
                  {c.allocatedUzs !== null ? (
                    <>
                      <ProgressBar className="mt-3" value={c.spentUzs} max={c.allocatedUzs} label={t(`categories.${c.category}`)} danger={over} />
                      {over && (
                        <p className="mt-1.5 text-xs font-medium text-[#ef4444]">
                          {t("allocations.over", { amount: formatMoney(c.spentUzs - c.allocatedUzs, "UZS", currentLocale) })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-[#94a3b8]">{t("allocations.noLimit")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Savings goals */}
      <section aria-label={t("goals.title")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[#0f172a]">{t("goals.title")}</h2>
          {canEdit && <AddGoalButton />}
        </div>
        {canEdit && <AddGoalForm />}
        {goals.length === 0 ? (
          <div className="bank-card p-8"><EmptyState>{t("goals.empty")}</EmptyState></div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                canEdit={canEdit}
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
    </div>
  );
}

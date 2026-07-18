import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BankCreditCard } from "@/components/bank/BankCreditCard";
import { QuickTransfer } from "@/components/bank/QuickTransfer";
import { AddFundsButton } from "@/components/budget/AddFundsButton";
import {
  BankArea,
  BankExpensePie,
  BankGroupedBars,
} from "@/components/bank/charts";
import { currentPeriod, getCategorySpend, getMonthSummary, getMonthlyTrend, getSavingsGoals } from "@/lib/budget-data";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/* Section card shell ---------------------------------------------------- */
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[#0f172a]">{title}</h2>
        {action}
      </div>
      <div className={`bank-card ${bodyClassName}`}>{children}</div>
    </section>
  );
}

const TX_META: Record<string, { grad: string; icon: string; sign: string; tone: string }> = {
  REMITTANCE: { grad: "from-[#d1fae5] to-[#d1fae5]", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", sign: "+", tone: "text-[#059669]" },
  INCOME: { grad: "from-[#dcfce7] to-[#bbf7d0]", icon: "M12 3v18m6-12l-6-6-6 6", sign: "+", tone: "text-[#059669]" },
  EXPENSE: { grad: "from-[#fff1e0] to-[#ffe6cf]", icon: "M3 6h18v13a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18", sign: "−", tone: "text-[#ef4444]" },
  SAVINGS: { grad: "from-[#dcfce7] to-[#bbf7d0]", icon: "M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4", sign: "→", tone: "text-[#0f172a]" },
};

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("bank");
  const tCat = await getTranslations("budget");
  const currentLocale = await getLocale();
  const period = currentPeriod();

  const [household, summary, trend, categories, recent, goals] = await Promise.all([
    prisma.household.findUnique({
      where: { id: user.householdId },
      select: {
        name: true,
        inviteCode: true,
        users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, image: true, role: true } },
      },
    }),
    getMonthSummary(user.householdId, period),
    getMonthlyTrend(user.householdId, period, 6),
    getCategorySpend(user.householdId, period),
    prisma.transaction.findMany({
      where: { householdId: user.householdId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      take: 4,
      select: { id: true, type: true, amount: true, currency: true, category: true, date: true },
    }),
    getSavingsGoals(user.householdId),
  ]);

  const goalsLite = goals.map((g) => ({
    id: g.id,
    name: g.name,
    currentAmount: g.currentAmount,
    targetAmount: g.targetAmount,
  }));

  const totalSaved = trend.reduce((a, p) => a + p.savedUzs, 0);
  const now = new Date();
  const validThru = `${String(now.getMonth() + 1).padStart(2, "0")}/${String((now.getFullYear() + 4) % 100).padStart(2, "0")}`;
  const code = household?.inviteCode ?? "00000000";
  const cardNumber = `•••• •••• •••• ${code.slice(-4)}`;

  const barData = trend.map((p) => ({
    name: formatMonth(p.monthStart, currentLocale),
    primary: p.incomeUzs,
    secondary: p.spentUzs,
  }));

  let running = 0;
  const areaData = trend.map((p) => {
    running += p.savedUzs;
    return { name: formatMonth(p.monthStart, currentLocale), value: running };
  });

  const pieSlices = categories
    .filter((c) => c.spentUzs > 0)
    .sort((a, b) => b.spentUzs - a.spentUzs)
    .slice(0, 5)
    .map((c) => ({ label: tCat(`categories.${c.category}`), value: c.spentUzs }));

  const members = (household?.users ?? [])
    .filter((m) => m.id !== user.id)
    .map((m) => ({ id: m.id, name: m.name, image: m.image ?? null, role: m.role }));

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      {/* Row 1: My Cards + Recent Transaction */}
      <div className="grid gap-7 xl:grid-cols-3">
        <Card
          title={t("myCards")}
          className="xl:col-span-2"
          bodyClassName="!bg-transparent !shadow-none"
          action={
            <div className="flex items-center gap-3">
              {goalsLite.length > 0 && <AddFundsButton goals={goalsLite} />}
              <Link href="/budget/manage" className="text-[15px] font-semibold text-[#0f172a] hover:text-[#0a7c53]">
                {t("seeAll")}
              </Link>
            </div>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <BankCreditCard
              variant="filled"
              balanceLabel={t("balance")}
              balance={formatMoney(totalSaved || summary.savedUzs, "UZS", currentLocale)}
              holderLabel={t("cardHolder")}
              holder={user.name ?? "—"}
              validLabel={t("validThru")}
              valid={validThru}
              number={cardNumber}
            />
            <BankCreditCard
              variant="light"
              balanceLabel={t("income")}
              balance={formatMoney(summary.incomeUzs, "UZS", currentLocale)}
              holderLabel={t("cardHolder")}
              holder={household?.name ?? "—"}
              validLabel={t("validThru")}
              valid={validThru}
              number={cardNumber}
            />
          </div>
        </Card>

        <Card title={t("recentTransaction")}>
          <div className="px-6 py-2">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#64748b]">{t("noRecipients")}</p>
            ) : (
              recent.map((tx) => {
                const meta = TX_META[tx.type] ?? TX_META.EXPENSE;
                const label =
                  tx.type === "EXPENSE" && tx.category
                    ? tCat(`categories.${tx.category}`)
                    : t(tx.type === "EXPENSE" ? "expense" : tx.type === "SAVINGS" ? "totalSaving" : "income");
                return (
                  <div key={tx.id} className="flex items-center gap-4 py-3.5">
                    <span className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.grad}`}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0f172a]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d={meta.icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#0f172a]">{label}</p>
                      <p className="text-[13px] text-[#94a3b8]">{formatDate(tx.date, currentLocale)}</p>
                    </div>
                    <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${meta.tone}`}>
                      {meta.sign}
                      {formatMoney(tx.amount.toNumber(), tx.currency, currentLocale)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Weekly Activity + Expense Statistics */}
      <div className="grid gap-7 xl:grid-cols-3">
        <Card
          title={t("weeklyActivity")}
          className="xl:col-span-2"
          bodyClassName="px-5 py-6"
          action={
            <div className="flex items-center gap-5 text-[13px]">
              <span className="flex items-center gap-2 text-[#64748b]"><span className="h-3 w-3 rounded-full bg-[#0a7c53]" />{t("deposit")}</span>
              <span className="flex items-center gap-2 text-[#64748b]"><span className="h-3 w-3 rounded-full bg-[#34d399]" />{t("withdraw")}</span>
            </div>
          }
        >
          <BankGroupedBars data={barData} primaryColor="#0a7c53" secondaryColor="#34d399" ariaLabel={t("weeklyActivity")} />
        </Card>

        <Card title={t("expenseStatistics")} bodyClassName="px-3 py-4">
          {pieSlices.length > 0 ? (
            <BankExpensePie slices={pieSlices} ariaLabel={t("expenseStatistics")} />
          ) : (
            <p className="py-16 text-center text-sm text-[#64748b]">—</p>
          )}
        </Card>
      </div>

      {/* Row 3: Quick Transfer + Balance History */}
      <div className="grid gap-7 xl:grid-cols-3">
        <Card title={t("quickTransfer")} bodyClassName="px-6 py-6">
          <QuickTransfer members={members} />
        </Card>

        <Card title={t("balanceHistory")} className="xl:col-span-2" bodyClassName="px-5 py-6">
          <BankArea data={areaData} ariaLabel={t("balanceHistory")} />
        </Card>
      </div>
    </div>
  );
}

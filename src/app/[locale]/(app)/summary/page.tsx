import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { YurtMark } from "@/components/Logo";
import { PrintButton } from "@/components/trust/PrintButton";
import {
  currentPeriod,
  getCategorySpend,
  getMonthSummary,
  getSavingsGoals,
  periodRange,
} from "@/lib/budget-data";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "summary" });
  return { title: t("title") };
}

/**
 * "Download my financial summary" — a one-page printable overview of the
 * current month's budget, goals and the Trust Score, in the same document
 * style as the trust report. The browser's print dialog produces the PDF.
 */
export default async function SummaryPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("summary");
  const tb = await getTranslations("budget");
  const tt = await getTranslations("trust");
  const currentLocale = await getLocale();

  const period = currentPeriod();
  const [household, monthSummary, categories, goals, trust] = await Promise.all([
    prisma.household.findUnique({
      where: { id: user.householdId },
      include: { users: { orderBy: { createdAt: "asc" } } },
    }),
    getMonthSummary(user.householdId, period),
    getCategorySpend(user.householdId, period),
    getSavingsGoals(user.householdId),
    getTrustData(user.householdId),
  ]);
  if (!household) return null;

  const generated = new Date();
  const monthLabel = new Intl.DateTimeFormat(
    currentLocale === "uz" ? "uz-UZ" : currentLocale === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" },
  ).format(periodRange(period).start);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/budget" className="text-sm font-semibold text-samarkand-700 hover:underline">
          ← {t("back")}
        </Link>
        <PrintButton label={t("download")} />
      </div>

      <article className="rounded-xl border border-sand-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-samarkand-700 pb-6">
          <div className="flex items-center gap-3">
            <YurtMark className="h-10 w-10" />
            <div>
              <div className="font-display text-xl font-bold text-samarkand-900">SendYurt</div>
              <div className="text-xs text-sand-700">{t("docSubtitle")}</div>
            </div>
          </div>
          <div className="text-right text-xs text-sand-700">
            <div className="font-semibold text-ink">{household.name}</div>
            <div className="mt-1">
              {tt("report.generated", { date: formatDate(generated, currentLocale) })}
            </div>
          </div>
        </header>

        <h1 className="mt-6 font-display text-2xl font-bold text-samarkand-950">
          {t("docTitle")}
        </h1>
        <p className="mt-1 text-sm capitalize text-sand-700">{monthLabel}</p>

        {/* Month totals */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          {(
            [
              ["income", monthSummary.incomeUzs],
              ["spent", monthSummary.spentUzs],
              ["saved", monthSummary.savedUzs],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-sand-200 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sand-700">
                {tb(`summary.${key === "income" ? "income" : key}`)}
              </div>
              <div className="mt-1 text-sm font-bold text-ink">
                {formatMoney(value, "UZS", currentLocale)}
              </div>
            </div>
          ))}
        </section>

        {/* Category budgets */}
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
            {t("categoriesTitle")}
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-sand-700">
                <th className="pb-2 font-semibold">{tb("form.category")}</th>
                <th className="pb-2 text-right font-semibold">{t("allocatedCol")}</th>
                <th className="pb-2 text-right font-semibold">{t("spentCol")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category} className="border-b border-sand-100">
                  <td className="py-1.5 text-ink">{tb(`categories.${c.category}`)}</td>
                  <td className="py-1.5 text-right text-sand-900">
                    {c.allocatedUzs !== null
                      ? formatMoney(c.allocatedUzs, "UZS", currentLocale)
                      : "—"}
                  </td>
                  <td className="py-1.5 text-right font-medium text-sand-900">
                    {formatMoney(c.spentUzs, "UZS", currentLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Goals */}
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
            {tb("goals.title")}
          </h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {goals.map((g) => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                return (
                  <tr key={g.id} className="border-b border-sand-100">
                    <td className="py-1.5 text-ink">{g.name}</td>
                    <td className="py-1.5 text-right text-sand-900">
                      {formatMoney(g.currentAmount, "UZS", currentLocale)} /{" "}
                      {formatMoney(g.targetAmount, "UZS", currentLocale)}
                    </td>
                    <td className="py-1.5 pl-4 text-right font-bold text-samarkand-800">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Trust score strip */}
        <section className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-sand-200 p-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
              {tt("title")}
            </h2>
            <p className="mt-1 text-xs text-sand-700">
              {tt("factors.consistency.title")}: {trust.result.consistency.score} ·{" "}
              {tt("factors.stability.title")}: {trust.result.stability.score} ·{" "}
              {tt("factors.savings.title")}: {trust.result.savings.score}
            </p>
          </div>
          <div className="font-display text-4xl font-bold text-samarkand-800">
            {trust.result.score}
            <span className="text-base font-normal text-sand-700">/100</span>
          </div>
        </section>

        <footer className="mt-10 border-t border-sand-200 pt-4 text-xs leading-relaxed text-sand-700">
          {tt("disclaimer")}
        </footer>
      </article>
    </div>
  );
}

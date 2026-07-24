import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { NewBudgetForm } from "@/components/budget/NewBudgetForm";
import { currentPeriod, getCategorySpend } from "@/lib/budget-data";
import { isCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "budget" });
  return { title: t("newBudget.title") };
}

// Small inline glyphs per category for the "Recently Set Budgets" table.
const CAT_ICON: Record<string, string> = {
  food: "M6 3v7a3 3 0 006 0V3M9 3v18M17 3c-1.5 1-2 3-2 6s.5 4 2 5v7",
  transport: "M5 16V7a2 2 0 012-2h10a2 2 0 012 2v9M5 16h14M5 16v2m14-2v2M8 19h.01M16 19h.01",
  household: "M3 11l9-7 9 7M5 10v10h14V10",
  utilities: "M13 2L3 14h7l-1 8 10-12h-7z",
  education: "M22 10L12 5 2 10l10 5 10-5zM6 12v5a6 3 0 0012 0v-5",
  health: "M12 21s-7-4.5-9.5-9A5 5 0 0112 5a5 5 0 019.5 7c-2.5 4.5-9.5 9-9.5 9z",
  clothing: "M6 3l6 3 6-3 3 5-4 2v11H7V10L3 8z",
  celebrations: "M4 20l6-14 8 8zM14 6l2-2M18 8l2-2",
  debt: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  other: "M4 6h16M4 12h16M4 18h16",
};

export default async function NewBudgetPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { category?: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  if (user.accessRole !== "ADMIN") redirect(`/${locale}/budget/manage`);

  const t = await getTranslations("budget");
  const currentLocale = await getLocale();
  const period = currentPeriod();

  const categories = await getCategorySpend(user.householdId, period);
  const initialCategory =
    searchParams.category && isCategory(searchParams.category) ? searchParams.category : "food";

  // Real "Recently Set Budgets": only categories that have a limit set.
  const budgeted = categories
    .filter((c) => c.allocatedUzs !== null)
    .map((c) => {
      const allocated = c.allocatedUzs as number;
      const pct = allocated > 0 ? Math.min(100, Math.round((c.spentUzs / allocated) * 100)) : 0;
      return { category: c.category, spent: c.spentUzs, allocated, pct, healthy: pct < 80 };
    });

  // Progress preview card shows the most-utilised budgeted category.
  const progress =
    [...budgeted].sort((a, b) => b.pct - a.pct)[0] ??
    { category: initialCategory, spent: 0, allocated: 0, pct: 0, healthy: true };

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Back navigation */}
      <nav className="mb-6">
        <Link href="/budget/manage" className="inline-flex items-center text-[#45464d] transition-colors hover:text-[#006c49]">
          <svg viewBox="0 0 24 24" className="mr-1 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[14px] font-medium">{t("newBudget.backToDashboard")}</span>
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: form */}
        <div className="lg:col-span-8">
          <NewBudgetForm period={period} initialCategory={initialCategory} />
        </div>

        {/* Right: info + progress + image */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Info card */}
          <div className="relative overflow-hidden rounded-[32px] border border-[#81d8ad] bg-[#9af2c5] p-6">
            <div className="relative z-10">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/40">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#00714d]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 014 12.7c-.6.5-1 1-1 1.8H9c0-.8-.4-1.3-1-1.8A7 7 0 0112 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="mb-2 text-[20px] font-semibold text-[#00714d]">{t("newBudget.infoTitle")}</h3>
              <p className="leading-relaxed text-[#005236]">{t("newBudget.infoBody")}</p>
              <div className="mt-6 flex items-center gap-2 text-[14px] font-medium text-[#00714d]">
                <span>{t("newBudget.readGuide")}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-[#006c49] opacity-5" />
          </div>

          {/* Progress preview */}
          <div className="rounded-[32px] border border-[#c6c6cd] bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <h4 className="mb-4 text-[14px] font-medium uppercase tracking-wider text-[#45464d]">{t("newBudget.currentProgress")}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f7f9fb]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#006c49]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={CAT_ICON[progress.category] ?? CAT_ICON.other} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span className="text-[14px] font-medium">{t(`categories.${progress.category}`)}</span>
                </div>
                <span className="text-[14px] font-semibold tabular-nums">{t("newBudget.used", { percent: progress.pct })}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                <div className={`h-full rounded-full ${progress.healthy ? "bg-[#006c49]" : "bg-[#ba1a1a]"}`} style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          </div>

          {/* Visual anchor */}
          <div className="relative h-48 overflow-hidden rounded-[32px] border border-[#c6c6cd]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBQadDepLqGPIyjBqPjBnI3j1WiG22XbdhO3TkscMDUlivvlhyQyDy5HinkmQvrGzPUTyCOdLWojdvErbWbAyAQG8h7ZtOODWLdM0hC0oaSJz3xPIfuiKQvJUOSPpPXTXCvyLl3kXDCPlopKO0VtOfrPxd6slnlur28NoWuRgyJTQvRJ-nj9UAyN-ZdTfkPcEuyZA3lGfLhpjAqd0L1pBkX6xPwaB20TR33NUegzHV3vBsrpgpgDlbTdBBrQ5JIjeBSknyByrYtGVL"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent p-4">
              <span className="text-[14px] font-medium text-white">{t("newBudget.manageWisely")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Set Budgets */}
      <section className="mt-6">
        <div className="rounded-[32px] border border-[#c6c6cd] bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-[20px] font-semibold text-[#191c1e]">{t("newBudget.recentTitle")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#c6c6cd] text-[14px] font-medium text-[#45464d]">
                  <th className="px-2 pb-2 font-medium">{t("newBudget.colCategory")}</th>
                  <th className="px-2 pb-2 font-medium">{t("newBudget.colLimit")}</th>
                  <th className="px-2 pb-2 font-medium">{t("newBudget.colRemaining")}</th>
                  <th className="px-2 pb-2 font-medium">{t("newBudget.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6]">
                {budgeted.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-6 text-center text-[#7e7576]">{t("newBudget.noBudgets")}</td></tr>
                )}
                {budgeted.map((b) => (
                  <tr key={b.category}>
                    <td className="px-2 py-4">
                      <span className="flex items-center gap-3">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#006c49]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={CAT_ICON[b.category] ?? CAT_ICON.other} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {t(`categories.${b.category}`)}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-[14px] font-semibold tabular-nums">{formatMoney(b.allocated, "UZS", currentLocale)}</td>
                    <td className="px-2 py-4">
                      {b.healthy ? (
                        <span className="rounded-full bg-[#9af2c5] px-2 py-1 text-xs font-bold uppercase text-[#00714d]">{t("newBudget.healthy")}</span>
                      ) : (
                        <span className="rounded-full bg-[#ffdad6] px-2 py-1 text-xs font-bold uppercase text-[#93000a]">{t("newBudget.nearLimit")}</span>
                      )}
                    </td>
                    <td className="px-2 py-4">
                      <Link href={{ pathname: "/budget/allocations/new", query: { category: b.category } }} aria-label={`${t("form.save")} ${t(`categories.${b.category}`)}`} className="inline-grid h-8 w-8 place-items-center text-[#7e7576] transition-colors hover:text-[#191c1e]">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

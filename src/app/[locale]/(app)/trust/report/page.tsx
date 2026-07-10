import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { YurtMark } from "@/components/Logo";
import { PrintButton } from "@/components/trust/PrintButton";
import { ScoreDial } from "@/components/trust/ScoreDial";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trust.report" });
  return { title: t("title") };
}

/**
 * A presentable one-page reliability summary a family could show a
 * microfinance officer: letterhead, reference, score with factor table,
 * 12-month arrival record and score history. Printing it (or "Save as
 * PDF" in the print dialog) produces the shareable document.
 */
export default async function TrustReportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("trust");
  const currentLocale = await getLocale();

  const [household, data] = await Promise.all([
    prisma.household.findUnique({
      where: { id: user.householdId },
      include: { users: { orderBy: { createdAt: "asc" } } },
    }),
    getTrustData(user.householdId),
  ]);
  if (!household) return null;

  const { result, timeline, history, hasDemoData } = data;
  const generated = new Date();
  const reference = `SY-${household.id.slice(-8).toUpperCase()}`;

  const factorRows = [
    { key: "consistency", score: result.consistency.score, weight: 40 },
    { key: "stability", score: result.stability.score, weight: 30 },
    { key: "savings", score: result.savings.score, weight: 30 },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Screen-only toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/trust"
          className="text-sm font-semibold text-samarkand-700 hover:underline"
        >
          ← {t("report.back")}
        </Link>
        <PrintButton />
      </div>

      {/* The document */}
      <article className="rounded-xl border border-sand-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-samarkand-700 pb-6">
          <div className="flex items-center gap-3">
            <YurtMark className="h-10 w-10" />
            <div>
              <div className="font-display text-xl font-bold text-samarkand-900">
                SendYurt
              </div>
              <div className="text-xs text-sand-700">{t("report.docSubtitle")}</div>
            </div>
          </div>
          <div className="text-right text-xs text-sand-700">
            <div className="font-mono font-semibold text-ink">{reference}</div>
            <div className="mt-1">
              {t("report.generated", { date: formatDate(generated, currentLocale) })}
            </div>
          </div>
        </header>

        <h1 className="mt-6 font-display text-2xl font-bold text-samarkand-950">
          {t("report.docTitle")}
        </h1>

        {hasDemoData && (
          <p className="mt-2 inline-block rounded bg-sand-100 px-2 py-1 text-xs font-semibold text-sand-800">
            {t("demoBadge")} — {t("report.demoNote")}
          </p>
        )}

        {/* Household */}
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
            {t("report.household")}
          </h2>
          <p className="mt-1 text-lg font-semibold text-ink">{household.name}</p>
          <ul className="mt-2 space-y-1 text-sm text-sand-900">
            {household.users.map((m) => (
              <li key={m.id}>
                {m.name} —{" "}
                {t(m.role === "SENDER" ? "report.memberSender" : "report.memberReceiver")}
              </li>
            ))}
          </ul>
        </section>

        {/* Score */}
        <section className="mt-8 flex flex-col items-center gap-6 rounded-xl border border-sand-200 p-6 sm:flex-row sm:gap-10">
          <ScoreDial score={result.score} label={t("title")} sublabel={t("outOf100")} animate={false} />
          <div className="w-full flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-sand-700">
                  <th className="pb-2 font-semibold">{t("report.factor")}</th>
                  <th className="pb-2 text-right font-semibold">{t("report.weightCol")}</th>
                  <th className="pb-2 text-right font-semibold">{t("report.scoreCol")}</th>
                </tr>
              </thead>
              <tbody>
                {factorRows.map((row) => (
                  <tr key={row.key} className="border-b border-sand-100">
                    <td className="py-2 font-medium text-ink">
                      {t(`factors.${row.key}.title`)}
                    </td>
                    <td className="py-2 text-right text-sand-800">{row.weight}%</td>
                    <td className="py-2 text-right font-bold text-samarkand-800">
                      {row.score}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.hasEnoughData && (
              <p className="mt-2 text-xs text-sand-700">{t("provisional")}</p>
            )}
          </div>
        </section>

        {/* 12-month record */}
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
            {t("report.recordTitle")}
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-sand-700">
                <th className="pb-2 font-semibold">{t("report.monthCol")}</th>
                <th className="pb-2 text-right font-semibold">{t("report.receivedCol")}</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((m) => (
                <tr key={m.key} className="border-b border-sand-100">
                  <td className="py-1.5 capitalize text-ink">
                    {formatMonth(new Date(m.monthStartIso), currentLocale)}{" "}
                    {new Date(m.monthStartIso).getUTCFullYear()}
                  </td>
                  <td className="py-1.5 text-right font-medium text-sand-900">
                    {m.amountUzs !== null
                      ? formatMoney(m.amountUzs, "UZS", currentLocale)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Score history */}
        {history.length > 1 && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sand-700">
              {t("report.historyTitle")}
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-sand-700">
                  <th className="pb-2 font-semibold">{t("report.dateCol")}</th>
                  <th className="pb-2 text-right font-semibold">{t("report.scoreCol")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => (
                  <tr key={i} className="border-b border-sand-100">
                    <td className="py-1.5 text-ink">
                      {formatDate(s.calculatedAt, currentLocale)}
                    </td>
                    <td className="py-1.5 text-right font-medium text-sand-900">
                      {s.score}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-10 border-t border-sand-200 pt-4 text-xs leading-relaxed text-sand-700">
          {t("disclaimer")}
        </footer>
      </article>
    </div>
  );
}

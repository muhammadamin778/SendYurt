import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trust" });
  return { title: t("title") };
}

const RING_C = 2 * Math.PI * 45; // ≈ 283

function statusFor(score: number): { key: "statusExcellent" | "statusGreat" | "statusGood" | "statusBuilding"; chip: string } {
  if (score >= 80) return { key: "statusExcellent", chip: "bg-[#6cf8bb] text-[#00714d]" };
  if (score >= 70) return { key: "statusGreat", chip: "bg-[#ffddb8] text-[#653e00]" };
  if (score >= 50) return { key: "statusGood", chip: "bg-[#dcfce7] text-[#065f3e]" };
  return { key: "statusBuilding", chip: "bg-[#e6e8ea] text-[#64748b]" };
}

const TONES = {
  green: { wrap: "bg-[#0a7c53]/10 text-[#0a7c53]", badge: "bg-[#0a7c53]/10 text-[#0a7c53]", bar: "bg-[#0a7c53]", score: "text-[#065f3e]" },
  gold: { wrap: "bg-[#b87500]/10 text-[#b87500]", badge: "bg-[#b87500]/10 text-[#b87500]", bar: "bg-[#b87500]", score: "text-[#b87500]" },
  navy: { wrap: "bg-[#131b2e]/10 text-[#131b2e]", badge: "bg-[#131b2e]/10 text-[#131b2e]", bar: "bg-[#131b2e]", score: "text-[#0f172a]" },
} as const;

const FACTOR_ICON: Record<string, string> = {
  consistency: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  stability: "M12 3v18M7 7l5-2 5 2M4 10l3 6a3 3 0 006 0M4 10l3-1M20 10l-3 6a3 3 0 01-6 0M20 10l-3-1",
  savings: "M19 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2M21 12h-4a2 2 0 000 4h4zM16 14h.01",
};

export default async function TrustPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("trust");
  const currentLocale = await getLocale();

  const [{ result }, snapsAsc] = await Promise.all([
    getTrustData(user.householdId),
    prisma.trustScoreSnapshot.findMany({ where: { householdId: user.householdId }, orderBy: { calculatedAt: "asc" } }),
  ]);

  const score = result.score;
  const ringOffset = RING_C - (Math.min(100, score) / 100) * RING_C;
  const status = statusFor(score);

  const factors = [
    { key: "consistency", titleKey: "titleConsistency", score: result.consistency.score, impact: "high" as const, target: 85, tone: "green" as const },
    { key: "stability", titleKey: "titleStability", score: result.stability.score, impact: "medium" as const, target: 80, tone: "gold" as const },
    { key: "savings", titleKey: "titleSavings", score: result.savings.score, impact: "medium" as const, target: 75, tone: "navy" as const },
  ];

  // Score history: collapse snapshots to one row per calendar month (latest
  // that month wins) so repeated same-day snapshots don't clutter the log.
  const byMonth = new Map<string, { date: Date; score: number }>();
  for (const s of snapsAsc) {
    byMonth.set(`${s.calculatedAt.getFullYear()}-${s.calculatedAt.getMonth()}`, { date: s.calculatedAt, score: s.score });
  }
  const monthly = Array.from(byMonth.values());
  const history = monthly
    .map((m, i) => ({ date: m.date, score: m.score, change: i > 0 ? m.score - monthly[i - 1].score : null }))
    .reverse()
    .slice(0, 6);

  const actions = [
    { titleKey: "actionRecurringTitle", descKey: "actionRecurringDesc", ctaKey: "actionRecurringCta", pts: 5, href: "/rates", icon: "M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" },
    { titleKey: "actionSavingsTitle", descKey: "actionSavingsDesc", ctaKey: "actionSavingsCta", pts: 3, href: "/budget", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  ];

  return (
    <div className="mx-auto max-w-[1140px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-bold text-[#0f172a]">{t("reliabilityTitle")}</h1>
        <p className="text-[#64748b]">{t("reliabilitySubtitle")}</p>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Gauge */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:col-span-5">
          <h3 className="mb-6 text-[20px] font-semibold text-[#0f172a]">{t("currentScore")}</h3>
          <div className="relative flex h-56 w-56 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="#eceef0" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="#b87500" strokeWidth="8" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringOffset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[56px] font-bold leading-none text-[#b87500]">{score}</span>
              <span className="text-xs font-medium uppercase tracking-widest text-[#653e00]">{t(status.key)}</span>
            </div>
          </div>
          <p className="mt-6 px-4 text-center text-[#64748b]">{t("encourage")}</p>
        </div>

        {/* Score breakdown */}
        <div className="md:col-span-7">
          <div className="h-full rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-[20px] font-semibold text-[#0f172a]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#b87500]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t("scoreBreakdown")}
            </h3>
            <div className="space-y-4">
              {factors.map((f) => {
                const tone = TONES[f.tone];
                const desc = t(`desc${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}` as "descConsistency");
                return (
                  <div key={f.key} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone.wrap}`}>
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={FACTOR_ICON[f.key]} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#0f172a]">{t(f.titleKey)}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>{f.impact === "high" ? t("impactHigh") : t("impactMedium")}</span>
                          </div>
                          <p className="text-xs text-[#64748b]">{desc}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 font-semibold tabular-nums ${tone.score}`}>{f.score}/100</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e0e3e5]">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, f.score)}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-[#191c1e]/20" style={{ left: `${f.target}%` }} title={`${f.target}`} />
                    </div>
                    <p className="mt-1 text-[10px] text-[#94a3b8]">{t("target", { n: f.target })}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* How to reach 90+ */}
        <div className="relative overflow-hidden rounded-xl border border-[#b87500]/20 bg-[#b87500]/[0.05] p-6 md:col-span-12">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[#ffb95f]/20 blur-3xl" />
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="relative z-10 flex-1">
              <h3 className="mb-2 text-[20px] font-semibold text-[#b87500]">{t("howToTitle")}</h3>
              <p className="mb-4 text-[#64748b]">{t("howToSubtitle")}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {actions.map((a) => (
                  <div key={a.titleKey} className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm transition-colors hover:border-[#0a7c53]">
                    <div className="flex items-start gap-3">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#b87500]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-[#0f172a]">{t(a.titleKey)}</h4>
                        <p className="mt-1 text-xs text-[#64748b]">{t(a.descKey)}</p>
                        <Link href={a.href} className="mt-3 flex items-center justify-between rounded-lg bg-[#0a7c53]/10 px-3 py-2 text-xs font-bold text-[#0a7c53] transition-all hover:bg-[#0a7c53] hover:text-white">
                          <span>{t(a.ctaKey)}</span>
                          <span className="rounded bg-[#0a7c53] px-2 py-0.5 text-[10px] text-white">{t("ptsBadge", { n: a.pts })}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex h-48 w-full shrink-0 items-end overflow-hidden rounded-xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-4 md:h-auto md:w-64 md:self-stretch">
              <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-[#4edea3]/10" />
              <p className="relative text-[12px] font-medium leading-tight text-white/90">{t("testimonial")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit-history use case */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-6 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#4edea3]/10" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-[#4edea3]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18v12H3zM3 10h18M7 15h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h3 className="text-[18px] font-semibold">{t("creditTitle")}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/75">{t("creditBody")}</p>
          </div>
        </div>
      </section>

      {/* Score history */}
      <section>
        <h3 className="mb-4 text-[20px] font-semibold text-[#0f172a]">{t("scoreHistory")}</h3>
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]">
                <tr>
                  <th className="px-6 py-4 font-bold">{t("thMonth")}</th>
                  <th className="px-6 py-4 font-bold">{t("thScore")}</th>
                  <th className="px-6 py-4 font-bold">{t("thChange")}</th>
                  <th className="px-6 py-4 font-bold">{t("thStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f7]">
                {history.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-[#64748b]">—</td></tr>
                )}
                {history.map((h, i) => {
                  const st = statusFor(h.score);
                  const up = (h.change ?? 0) >= 0;
                  return (
                    <tr key={i}>
                      <td className="px-6 py-4 text-[#0f172a]">{formatMonth(h.date, currentLocale)} {h.date.getFullYear()}</td>
                      <td className="px-6 py-4 font-bold text-[#0f172a]">{h.score}</td>
                      <td className={`px-6 py-4 ${up ? "text-[#0a7c53]" : "text-[#ef4444]"}`}>
                        {h.change === null ? (
                          <span className="text-[#94a3b8]">—</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={up ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {up ? "+" : ""}{h.change}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[12px] font-bold ${st.chip}`}>{t(st.key)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-[#94a3b8]">{t("disclaimer")}</p>
    </div>
  );
}

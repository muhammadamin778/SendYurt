import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HistoryControls } from "@/components/history/HistoryControls";
import { ExportCsvButton } from "@/components/history/ExportCsvButton";
import { getSavingsGoals } from "@/lib/budget-data";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrustData } from "@/lib/trust-data";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: t("title") };
}

const PAGE_SIZE = 8;
type Kind = "remittance" | "savings" | "trust";
type Status = "completed" | "processing" | "applied" | "failed";

interface Row {
  id: string;
  date: Date;
  kind: Kind;
  member: string;
  description: string;
  sub?: string;
  amount: string;
  amountPlain: string;
  amountTone: string;
  status: Status;
  search: string;
}

const TYPE_STYLE: Record<Kind, { chip: string; icon: string; typeKey: string }> = {
  remittance: { chip: "bg-[#131b2e] text-[#4edea3]", icon: "M3 6h18v12H3zM3 10h18M7 15h4", typeKey: "typeRemittance" },
  savings: { chip: "bg-[#dcfce7] text-[#0a7c53]", icon: "M19 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2M21 12h-4a2 2 0 000 4h4zM16 14h.01", typeKey: "typeSavings" },
  trust: { chip: "bg-[#fff0d1] text-[#b87500]", icon: "M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.6 6.1 21l1.2-6.5L2.5 9.9 9.1 9z", typeKey: "typeTrust" },
};

const STATUS_STYLE: Record<Status, string> = {
  completed: "bg-[#dcfce7] text-[#065f3e]",
  processing: "bg-[#ffddb8] text-[#b87500]",
  applied: "bg-[#dae2fd] text-[#3f465c]",
  failed: "bg-[#ffdad6] text-[#93000a]",
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default async function HistoryPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { filter?: string; q?: string; range?: string; page?: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("history");
  const tTrust = await getTranslations("trust");
  const currentLocale = await getLocale();

  const filter = ["remittances", "savings", "trust"].includes(searchParams.filter ?? "") ? searchParams.filter! : "all";
  const range = ["3m", "ytd", "all"].includes(searchParams.range ?? "") ? searchParams.range! : "30d";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [txns, snaps, goals, { result }] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId: user.householdId, type: { in: ["REMITTANCE", "SAVINGS"] } },
      orderBy: { date: "desc" },
      include: { sender: { select: { name: true } }, receiver: { select: { name: true } }, provider: { select: { name: true } } },
    }),
    prisma.trustScoreSnapshot.findMany({ where: { householdId: user.householdId }, orderBy: { calculatedAt: "asc" } }),
    getSavingsGoals(user.householdId),
    getTrustData(user.householdId),
  ]);

  // Build unified rows ------------------------------------------------------
  const rows: Row[] = [];

  for (const tx of txns) {
    const amt = tx.amount.toNumber();
    const member = tx.sender ? firstName(tx.sender.name) : t("system");
    if (tx.type === "REMITTANCE") {
      const description = tx.receiver ? t("sentTo", { name: tx.receiver.name }) : tx.note ?? t("typeRemittance");
      const sub = tx.provider ? t("via", { provider: tx.provider.name }) : undefined;
      const status: Status = tx.status === "COMPLETED" ? "completed" : tx.status === "FAILED" ? "failed" : "processing";
      rows.push({
        id: tx.id, date: tx.date, kind: "remittance", member, description, sub,
        amount: `-${formatMoney(amt, tx.currency, currentLocale)}`,
        amountPlain: `-${formatMoney(amt, tx.currency, currentLocale)}`,
        amountTone: "text-[#ef4444]", status,
        search: `${description} ${sub ?? ""} ${member}`.toLowerCase(),
      });
    } else {
      const description = tx.note ?? t("typeSavings");
      rows.push({
        id: tx.id, date: tx.date, kind: "savings", member, description,
        amount: `+${formatMoney(amt, tx.currency, currentLocale)}`,
        amountPlain: `+${formatMoney(amt, tx.currency, currentLocale)}`,
        amountTone: "text-[#0a7c53]", status: "completed",
        search: `${description} ${member}`.toLowerCase(),
      });
    }
  }

  for (let i = 1; i < snaps.length; i++) {
    const delta = snaps[i].score - snaps[i - 1].score;
    if (delta === 0) continue;
    const pts = t("pts", { n: `${delta > 0 ? "+" : ""}${delta}` });
    rows.push({
      id: `trust-${snaps[i].id}`, date: snaps[i].calculatedAt, kind: "trust", member: t("system"),
      description: t("trustUpdate"),
      amount: pts, amountPlain: pts,
      amountTone: delta > 0 ? "text-[#0a7c53]" : "text-[#ef4444]", status: "applied",
      search: `${t("trustUpdate")} ${t("system")}`.toLowerCase(),
    });
  }

  // Filter + search + range ------------------------------------------------
  const now = new Date();
  const rangeStart =
    range === "3m" ? new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    : range === "ytd" ? new Date(now.getFullYear(), 0, 1)
    : range === "all" ? new Date(0)
    : new Date(now.getTime() - 30 * 864e5);

  const filtered = rows
    .filter((r) => (filter === "all" ? true : filter === "remittances" ? r.kind === "remittance" : filter === "savings" ? r.kind === "savings" : r.kind === "trust"))
    .filter((r) => r.date >= rangeStart)
    .filter((r) => (q ? r.search.includes(q) : true))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // Summary cards ----------------------------------------------------------
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let thisMonthRem = 0, lastMonthRem = 0;
  for (const tx of txns) {
    if (tx.type !== "REMITTANCE") continue;
    const a = tx.amount.toNumber();
    if (tx.date >= monthStart) thisMonthRem += a;
    else if (tx.date >= prevMonthStart && tx.date < monthStart) lastMonthRem += a;
  }
  const remDelta = lastMonthRem > 0 ? Math.round(((thisMonthRem - lastMonthRem) / lastMonthRem) * 100) : null;
  const totalSavings = goals.reduce((s, g) => s + g.currentAmount, 0);
  const trustVerdict = result.score >= 75 ? tTrust("verdict.strong") : result.score >= 50 ? tTrust("verdict.growing") : tTrust("verdict.early");

  // CSV (full filtered set) ------------------------------------------------
  const csvHeaders = [t("thDate"), t("thType"), t("thDescription"), t("thMember"), t("thAmount"), t("thStatus")];
  const csvRows = filtered.map((r) => [
    formatDate(r.date, currentLocale),
    t(TYPE_STYLE[r.kind].typeKey),
    r.sub ? `${r.description} (${r.sub})` : r.description,
    r.member,
    r.amountPlain,
    t(`status${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}` as "statusCompleted"),
  ]);

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (filter !== "all") sp.set("filter", filter);
    if (q) sp.set("q", q);
    if (range !== "30d") sp.set("range", range);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/history${s ? `?${s}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-[32px] font-bold text-[#0f172a]">{t("title")}</h1>
          <p className="max-w-2xl text-[18px] text-[#64748b]">{t("subtitle")}</p>
        </div>
        <ExportCsvButton headers={csvHeaders} rows={csvRows} />
      </header>

      {/* Controls */}
      <HistoryControls filter={filter} range={range} q={searchParams.q ?? ""} />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <tr>
                {[t("thDate"), t("thType"), t("thDescription"), t("thMember"), t("thAmount"), t("thStatus")].map((h, i) => (
                  <th key={h} className={`px-4 py-4 text-xs font-medium uppercase tracking-wider text-[#64748b] ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7] text-[15px]">
              {pageRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#64748b]">{t("empty")}</td></tr>
              )}
              {pageRows.map((r) => {
                const st = TYPE_STYLE[r.kind];
                return (
                  <tr key={r.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="whitespace-nowrap px-4 py-5 text-[#64748b]">{formatDate(r.date, currentLocale)}</td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${st.chip}`}>
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={st.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <span className="font-medium text-[#0f172a]">{t(st.typeKey)}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-5">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#0f172a]">{r.description}</span>
                        {r.sub && <span className="text-xs text-[#94a3b8]">{r.sub}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-5"><span className="rounded bg-[#f1f5f9] px-2 py-1 text-sm text-[#475569]">{r.member}</span></td>
                    <td className={`px-4 py-5 text-right font-semibold tabular-nums ${r.amountTone}`}>{r.amount}</td>
                    <td className="px-4 py-5"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-tight ${STATUS_STYLE[r.status]}`}>{t(`status${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}` as "statusCompleted")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
          <span className="text-sm text-[#64748b]">{t("showing", { shown: pageRows.length, total })}</span>
          <div className="flex items-center gap-2">
            <PageBtn href={pageHref(clampedPage - 1)} disabled={clampedPage <= 1} icon="M15 18l-6-6 6-6" />
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((p) => (
              <Link key={p} href={pageHref(p)} className={`grid h-8 min-w-8 place-items-center rounded px-2 text-sm font-medium transition-colors ${p === clampedPage ? "bg-[#0a7c53] text-white" : "text-[#64748b] hover:bg-[#e6e8ea]"}`}>{p}</Link>
            ))}
            <PageBtn href={pageHref(clampedPage + 1)} disabled={clampedPage >= totalPages} icon="M9 18l6-6-6-6" />
          </div>
        </div>
      </div>

      {/* Summary bento */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-xl bg-[#6cf8bb]/60 p-4">
          <span className="text-sm font-medium text-[#00714d]">{t("monthlyRemittance")}</span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#00714d]">{formatMoney(thisMonthRem, "UZS", currentLocale)}</span>
            {remDelta !== null && (
              <span className="text-xs font-medium text-[#00714d]/70">{remDelta >= 0 ? "↑" : "↓"} {t("vsLastMonth", { percent: Math.abs(remDelta) })}</span>
            )}
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-[#e6e8ea] p-4">
          <span className="text-sm font-medium text-[#64748b]">{t("totalSavings")}</span>
          <span className="block text-[28px] font-bold text-[#0f172a]">{formatMoney(totalSavings, "UZS", currentLocale)}</span>
        </div>
        <div className="space-y-2 rounded-xl border border-white/10 bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#bec6e0]">{t("householdTrust")}</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#4edea3]" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z" /></svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#4edea3]">{result.score}</span>
            <span className="text-xs font-medium text-[#bec6e0]">{trustVerdict}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function PageBtn({ href, disabled, icon }: { href: string; disabled: boolean; icon: string }) {
  const glyph = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  if (disabled) return <span className="grid h-8 w-8 place-items-center rounded text-[#cbd5e1]">{glyph}</span>;
  return <Link href={href} className="grid h-8 w-8 place-items-center rounded text-[#64748b] transition-colors hover:bg-[#e6e8ea]">{glyph}</Link>;
}

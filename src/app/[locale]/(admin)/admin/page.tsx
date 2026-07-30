import Link from "next/link";
import { exportOperationsReport } from "@/app/actions/admin-export";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { requireStaff } from "@/lib/admin";
import { IllustrativeTag } from "@/components/admin/IllustrativeTag";
import { setRequestLocale } from "next-intl/server";
import { toMinor, ZERO, type Minor } from "@/lib/money";
import { formatMoney } from "@/lib/format";
import { readPrisma } from "@/lib/prisma-read";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CARD = "rounded-xl border border-[#bec9c0] bg-white";

/** Chip styling per transaction state, matching the transactions monitor. */
const FEED_STATUS: Record<string, { label: string; chip: string }> = {
  COMPLETED: { label: "COMPLETED", chip: "bg-[#006c49]/10 text-[#006c49]" },
  PENDING: { label: "PENDING", chip: "bg-[#fed65b]/40 text-[#745c00]" },
  FAILED: { label: "FAILED", chip: "bg-[#ba1a1a]/10 text-[#ba1a1a]" },
  DISPUTED: { label: "DISPUTED", chip: "bg-[#772f2c]/10 text-[#772f2c]" },
  REVERSED: { label: "REVERSED", chip: "bg-[#bec9c0]/40 text-[#3f4943]" },
};

interface Corridor { src: string; volume: Minor; count: number }
interface RecentTx { id: string; type: string; status: string; amount: Minor; currency: string; date: Date; sourceCurrency: string | null }

export default async function AdminDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  // This page previously relied solely on the layout guard — the only admin
  // page that did. Server Actions on it (the export) are reachable
  // independently, so it re-checks like every other page.
  const staff = await requireStaff("transaction.view");

  // Real aggregates via the read client (Neon replica when DATABASE_READ_URL
  // is set). Wrapped so a transient DB blip (e.g. Neon waking from suspend)
  // degrades to zeros + a notice instead of blanking the whole page.
  let userCount = 0, txCount = 0;
  let totalVolume: Minor = ZERO;
  let corridors: Corridor[] = [];
  let recent: RecentTx[] = [];
  let dataError = false;

  try {
    const [uc, tc, volumeAgg, corridorsRaw, recentRaw] = await Promise.all([
      readPrisma.user.count(),
      readPrisma.transaction.count(),
      readPrisma.transaction.aggregate({ _sum: { amount: true } }),
      readPrisma.transaction.groupBy({
        by: ["sourceCurrency"],
        where: { sourceCurrency: { not: null } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      readPrisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 4,
        select: { id: true, type: true, status: true, amount: true, currency: true, date: true, sourceCurrency: true },
      }),
    ]);
    userCount = uc;
    txCount = tc;
    totalVolume = volumeAgg._sum.amount == null ? ZERO : toMinor(volumeAgg._sum.amount);
    corridors = corridorsRaw
      .map((c) => ({ src: c.sourceCurrency ?? "—", volume: c._sum.amount == null ? ZERO : toMinor(c._sum.amount), count: c._count._all }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);
    recent = recentRaw.map((t) => ({ ...t, amount: toMinor(t.amount) }));
  } catch (e) {
    console.error("admin dashboard data unavailable", e);
    dataError = true;
  }

  const topVolume = corridors[0]?.volume || 1; // guard against divide-by-zero

  const metrics = [
    { label: "Total Volume", value: formatMoney(totalVolume, "UZS", "en"), icon: "M12 3v18M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", accent: "#006c49", kind: "chip", real: true },
    { label: "Active Users", value: userCount.toLocaleString("en-US"), icon: "M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a4 4 0 10-4-4 4 4 0 004 4zm0 2c-2.7 0-8 1.3-8 4v3h9M16 13c2.7 0 8 1.3 8 4v3h-9", accent: "#735c00", kind: "sub", real: true },
    { label: "Liquidity Ratio", value: "1.84", icon: "M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z", accent: "#954642", kind: "bar", real: false },
    { label: "System Health", value: "99.98%", icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4", accent: "#006c49", kind: "status", real: false },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#005136]">Platform Overview</p>
          <h2 className="flex items-center gap-3 text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">
            Operations Dashboard
            <span className="rounded-full bg-[#fed65b]/50 px-2 py-0.5 text-xs font-bold text-[#745c00]">LIVE</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#bec9c0]/40 bg-[#e7e8e9] px-3 py-1.5 text-[#3f4943]">
            <Icon d="M7 3v4M17 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" className="h-[18px] w-[18px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em]">Last 24 Hours</span>
          </div>
          {staff.can("transaction.export") && <ExportCsvButton
            action={exportOperationsReport}
            label="Export Report"
            className="flex items-center gap-2 rounded-lg border border-[#bec9c0] bg-[#f8f9fa] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#191c1d] transition-all hover:border-[#006c49] hover:bg-[#edeeef] disabled:opacity-60"
          />}
        </div>
      </div>

      {dataError && (
        <div className="mb-6 rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-4 py-3 text-[13px] text-[#93000a]">
          Live metrics are temporarily unavailable (the database is waking up). Refresh in a moment.
        </div>
      )}

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`${CARD} flex flex-col justify-between p-4 transition-all hover:border-[#006c49]/50`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">{m.label}</p>
                <h3 className="mt-1 text-[20px] font-semibold tabular-nums text-[#191c1d]">{m.value}</h3>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: `${m.accent}1a`, color: m.accent }}>
                <Icon d={m.icon} className="h-5 w-5" />
              </span>
            </div>
            {m.kind === "chip" ? (
              <div className="flex items-center justify-between">
                <svg viewBox="0 0 100 30" className="h-8 w-24 fill-none stroke-[#006c49] stroke-2"><path d="M0 25 Q10 5 20 20 T40 15 T60 25 T80 5 T100 15" strokeLinecap="round" /></svg>
                <span className="rounded bg-[#006c49]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#006c49]">+12.4%</span>
              </div>
            ) : m.kind === "sub" ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6f7a72]">Transactions: <span className="font-bold text-[#191c1d]">{txCount.toLocaleString("en-US")}</span></span>
                <span className="font-bold text-[#006c49]">Stable</span>
              </div>
            ) : m.kind === "bar" ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e7e8e9]"><div className="h-full bg-[#735c00]" style={{ width: "75%" }} /></div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]" />
                <span className="text-[11px] font-bold text-[#15803d]">All Nodes Operational</span>
              </div>
            )}
            {!m.real && <IllustrativeTag className="mt-2" />}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Remittance hub */}
        <div className={`${CARD} col-span-12 flex h-[500px] flex-col overflow-hidden lg:col-span-8`}>
          <div className="flex items-center justify-between border-b border-[#bec9c0] p-4">
            <h4 className="flex items-center gap-2 text-[16px] font-semibold text-[#191c1d]">
              <span className="text-[#006c49]"><Icon d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" /></span>
              Global Remittance Hub
            </h4>
            <IllustrativeTag />
          </div>
          <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-[#0b3b2a] via-[#00352a] to-[#0b1220]">
            <div aria-hidden className="pointer-events-none absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-[#4edea3]/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute left-1/4 top-1/3 h-2 w-2 rounded-full bg-[#4edea3] shadow-[0_0_12px_#4edea3]" />
            <div aria-hidden className="pointer-events-none absolute right-1/3 top-1/2 h-2 w-2 rounded-full bg-[#fed65b] shadow-[0_0_12px_#fed65b]" />
            <p className="absolute left-6 top-6 max-w-[220px] text-[12px] leading-relaxed text-white/50">
              Live corridor map is illustrative in this build — the panel below reflects real transaction volume by source currency.
            </p>
            {/* Hot corridors overlay — REAL data */}
            <div className="absolute bottom-6 right-6 w-[260px] rounded-xl border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9df4c8]">Hot Corridors</p>
                <span className="h-2 w-2 animate-ping rounded-full bg-[#4edea3]" />
              </div>
              <div className="space-y-3">
                {corridors.length === 0 && <p className="text-[12px] text-white/60">No transfers yet.</p>}
                {corridors.map((c) => (
                  <div key={c.src}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{c.src} → UZS</span>
                      <span className="text-[10px] font-bold tabular-nums text-[#9df4c8]">{formatMoney(c.volume, "UZS", "en")}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-[#4edea3]" style={{ width: `${Math.round((c.volume / topVolume) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
          {/* Activity feed — real recent transactions */}
          <div className={`${CARD} flex flex-1 flex-col overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[#bec9c0] p-4">
              <h4 className="flex items-center gap-2 text-[16px] font-semibold text-[#191c1d]">
                <span className="text-[#006c49]"><Icon d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></span>
                Activity Feed
              </h4>
              <span className="text-[10px] font-bold uppercase text-[#6f7a72]">Latest</span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {recent.length === 0 && <p className="text-[13px] text-[#6f7a72]">No recent activity.</p>}
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 border-b border-[#bec9c0]/30 pb-4 last:border-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#006c49]/10 text-[#006c49]">
                    <Icon d="M4 6h16M4 6l3-3M4 6l3 3M20 18H4m16 0l-3-3m3 3l-3 3" className="h-[18px] w-[18px]" />
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-[13px] font-bold text-[#191c1d]">{tx.type === "REMITTANCE" ? "Remittance" : tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}</p>
                      <span className="text-[10px] text-[#6f7a72]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(tx.date)}</span>
                    </div>
                    <p className="text-[12px] text-[#3f4943]">{tx.sourceCurrency ? `${tx.sourceCurrency} → UZS` : "Ledger"} · {formatMoney(tx.amount, tx.currency, "en")}</p>
                    {/* The real state — this chip used to read COMPLETED on
                        every row, so a failed or reversed transfer looked fine. */}
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${FEED_STATUS[tx.status]?.chip ?? FEED_STATUS.PENDING.chip}`}>
                      {FEED_STATUS[tx.status]?.label ?? tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={`/${locale}/admin/audit`}
              className="border-t border-[#bec9c0] p-3 text-center text-[12px] font-bold uppercase tracking-[0.05em] text-[#006c49] transition-colors hover:bg-[#006c49]/5"
            >
              View Detailed Audit Log
            </Link>
          </div>

          {/* Network status — illustrative */}
          <div className="relative overflow-hidden rounded-xl bg-[#005136] p-5 text-white shadow-lg shadow-[#005136]/10">
            <h5 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
              <Icon d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
              Network Status
            </h5>
            <div className="space-y-4">
              {[
                ["Fiat Gateways", "ONLINE", true],
                ["Crypto Bridges", "ONLINE", true],
                ["Compliance API", "LOCKED", false],
              ].map(([label, state, ok]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-[13px] opacity-80">{label as string}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ok ? "border-[#22c55e]/30 bg-[#22c55e]/20 text-[#86efac]" : "border-[#fed65b]/30 bg-[#fed65b]/20 text-[#fed65b]"}`}>{state as string}</span>
                </div>
              ))}
            </div>
            <IllustrativeTag className="mt-4 border-white/20 bg-white/10 text-white/70" />
          </div>
        </div>
      </div>

      {/* Corridor table — REAL route paths + volume; latency/reliability illustrative */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[16px] font-semibold text-[#191c1d]">Corridor Metrics</h4>
          <div className="flex items-center gap-2 text-[12px] text-[#6f7a72]"><span className="h-2 w-2 rounded-full bg-[#006c49]" /> Optimal <span className="h-2 w-2 rounded-full bg-[#735c00]" /> Delayed</div>
        </div>
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#bec9c0] bg-[#f3f4f5]">
                  {["Corridor", "Route Path", "Transfers", "Volume", "Volume share", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec9c0]/30">
                {corridors.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-[#6f7a72]">No corridor data yet.</td></tr>
                )}
                {corridors.map((c, i) => {
                  const pct = Math.round((c.volume / topVolume) * 100);
                  return (
                    <tr key={c.src} className="transition-colors hover:bg-[#006c49]/5">
                      <td className="px-4 py-3 font-bold text-[#005136]">#{c.src}-UZS-0{i + 1}</td>
                      <td className="px-4 py-3"><span className="flex items-center gap-2">{c.src} <span className="text-[#6f7a72]">→</span> UZS</span></td>
                      <td className="px-4 py-3 tabular-nums">{c.count.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(c.volume, "UZS", "en")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e1e3e4]"><div className="h-full bg-[#006c49]" style={{ width: `${pct}%` }} /></div>
                          <span className="font-bold tabular-nums">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[#006c49]"><Icon d="M4 17l6-6 4 4 8-8M15 7h6v6" className="h-[18px] w-[18px]" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

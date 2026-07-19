import { setRequestLocale } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/admin";
import { paginate, parsePageParams } from "@/lib/pagination";
import { readPrisma } from "@/lib/prisma-read";

function timeAgo(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STATUS_STYLE: Record<string, { label: string; chip: string }> = {
  COMPLETED: { label: "Completed", chip: "bg-[#006c49] text-white" },
  PENDING: { label: "Pending", chip: "bg-[#fed65b] text-[#745c00] ring-1 ring-[#735c00]/20" },
  FAILED: { label: "Flagged", chip: "bg-[#ba1a1a] text-white" },
};
const PROVIDER_COLOR = ["#006c49", "#735c00", "#772f2c", "#005136", "#954642"];

export default async function AdminTransactionsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; status?: string; provider?: string; corridor?: string };
}) {
  setRequestLocale(locale);
  await requireAdmin();

  const params = parsePageParams({ page: searchParams.page }, { defaultSize: 10 });
  const status = ["COMPLETED", "PENDING", "FAILED"].includes(searchParams.status ?? "") ? searchParams.status : undefined;
  const providerId = searchParams.provider || undefined;
  const corridor = searchParams.corridor || undefined;

  const where = {
    type: "REMITTANCE" as const,
    ...(status ? { status } : {}),
    ...(providerId ? { providerId } : {}),
    ...(corridor ? { sourceCurrency: corridor } : {}),
  };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let page = { items: [] as Awaited<ReturnType<typeof load>>["items"], page: 1, pageSize: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
  let volume24h = 0, activeCount = 0, flaggedCount = 0;
  let providers: { id: string; name: string }[] = [];
  let corridors: string[] = [];
  let dataError = false;

  async function load() {
    return paginate(params, {
      count: () => readPrisma.transaction.count({ where }),
      findMany: ({ skip, take }) =>
        readPrisma.transaction.findMany({
          where,
          skip,
          take,
          orderBy: { date: "desc" },
          select: {
            id: true, amount: true, currency: true, sourceAmount: true, sourceCurrency: true, status: true, date: true,
            sender: { select: { name: true } },
            receiver: { select: { name: true } },
            provider: { select: { name: true } },
          },
        }),
    });
  }

  try {
    const [p, volAgg, active, flagged, provs, corrRaw] = await Promise.all([
      load(),
      readPrisma.transaction.aggregate({ where: { type: "REMITTANCE", date: { gte: dayAgo } }, _sum: { amount: true } }),
      readPrisma.transaction.count({ where: { type: "REMITTANCE" } }),
      readPrisma.transaction.count({ where: { type: "REMITTANCE", status: "FAILED" } }),
      readPrisma.remittanceProvider.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      readPrisma.transaction.groupBy({ by: ["sourceCurrency"], where: { type: "REMITTANCE", sourceCurrency: { not: null } } }),
    ]);
    page = p;
    volume24h = volAgg._sum.amount?.toNumber() ?? 0;
    activeCount = active;
    flaggedCount = flagged;
    providers = provs;
    corridors = corrRaw.map((c) => c.sourceCurrency).filter((c): c is string => !!c);
  } catch (e) {
    console.error("admin transactions data unavailable", e);
    dataError = true;
  }

  const total = page.total;
  const showingFrom = total === 0 ? 0 : params.skip + 1;
  const showingTo = Math.min(params.skip + params.pageSize, total);
  const pageQ = (n: number) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (providerId) p.set("provider", providerId);
    if (corridor) p.set("corridor", corridor);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };

  const selCls = "w-full rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2 text-[14px] text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]";

  const stats = [
    { label: "Total Volume (24h)", value: formatMoney(volume24h, "UZS", "en"), sub: "+12.4%", note: "received in last 24h", icon: "M4 17l6-6 4 4 8-8M15 7h6v6", ring: false, tone: "#006c49" },
    { label: "Active Remittances", value: activeCount.toLocaleString("en-US"), sub: "REMITTANCE", note: "total on ledger", icon: "M4 6h16M4 6l3-3M4 6l3 3M20 18H4m16 0l-3-3m3 3l-3 3", ring: false, tone: "#006c49" },
    { label: "Flagged Review", value: flaggedCount.toLocaleString("en-US"), sub: "High Priority", note: "requires action", icon: "M12 9v4m0 3v.5M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z", ring: true, tone: "#ba1a1a" },
    { label: "Avg Time to UZ", value: "4.2m", sub: "Healthy", note: "within 5m target", icon: "M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z", ring: false, tone: "#006c49", illustrative: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stat bar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border bg-white p-4 ${s.ring ? "border-[#ba1a1a]/40 ring-2 ring-[#ba1a1a]/20" : "border-[#bec9c0]"}`}>
            <div className="mb-2 flex items-start justify-between">
              <p className={`text-[12px] font-semibold uppercase tracking-[0.05em] ${s.ring ? "text-[#ba1a1a]" : "text-[#6f7a72]"}`}>{s.label}</p>
              <span style={{ color: s.tone }}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={s.icon} strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </div>
            <p className={`text-[24px] font-semibold tabular-nums ${s.ring ? "text-[#ba1a1a]" : "text-[#191c1d]"}`}>{s.value}</p>
            <div className="mt-2 flex items-center gap-1 text-[11px]">
              <span className="font-bold" style={{ color: s.tone }}>{s.sub}</span>
              <span className="text-[#6f7a72]">{s.note}</span>
            </div>
            {s.illustrative && <p className="mt-1 text-[10px] italic text-[#6f7a72]">Illustrative</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-4 rounded-xl border border-[#bec9c0] bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <p className="mb-1 ml-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Corridor</p>
          <select name="corridor" defaultValue={corridor ?? ""} className={selCls}>
            <option value="">All Corridors</option>
            {corridors.map((c) => <option key={c} value={c}>{c} → UZS</option>)}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="mb-1 ml-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Status</p>
          <select name="status" defaultValue={status ?? ""} className={selCls}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Flagged</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="mb-1 ml-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Provider</p>
          <select name="provider" defaultValue={providerId ?? ""} className={selCls}>
            <option value="">All Providers</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-[#006c49] px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-white hover:bg-[#005136]">Apply Filters</button>
          <a href="?" className="rounded-lg border border-[#bec9c0] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] hover:bg-[#edeeef]">Reset</a>
        </div>
      </form>

      {dataError && (
        <div className="rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-4 py-3 text-[13px] text-[#93000a]">Transaction data is temporarily unavailable (database waking up). Refresh in a moment.</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#bec9c0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#bec9c0] bg-[#edeeef]">
                {["Transaction ID", "Sender", "Receiver", "Corridor", "Provider", "Amount", "Status", "Time"].map((h, i) => (
                  <th key={h} className={`p-4 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] ${[3, 6].includes(i) ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec9c0]">
              {page.items.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-[#6f7a72]">No transactions match these filters.</td></tr>
              )}
              {page.items.map((t, i) => {
                const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.PENDING;
                const flagged = t.status === "FAILED";
                const pc = PROVIDER_COLOR[i % PROVIDER_COLOR.length];
                return (
                  <tr key={t.id} className={`transition-colors hover:bg-[#f3f4f5] ${flagged ? "bg-[#ba1a1a]/5" : ""}`}>
                    <td className={`p-4 font-mono text-[13px] font-bold ${flagged ? "text-[#ba1a1a]" : "text-[#191c1d]"}`}>#{t.id.slice(-8).toUpperCase()}-UZ</td>
                    <td className="p-4 text-[14px] text-[#191c1d]">{t.sender?.name ?? "—"}</td>
                    <td className="p-4">
                      <p className="text-[14px] leading-none text-[#191c1d]">{t.receiver?.name ?? "—"}</p>
                      <p className="text-[11px] text-[#3f4943]">{t.provider?.name ? `${t.provider.name}` : "Wallet"}</p>
                    </td>
                    <td className="p-4 text-center text-[14px]">{t.sourceCurrency ?? "—"} → UZS</td>
                    <td className="p-4"><span className="flex items-center gap-2 text-[14px] text-[#191c1d]"><span className="h-4 w-4 rounded-sm" style={{ backgroundColor: pc }} /> {t.provider?.name ?? "—"}</span></td>
                    <td className={`p-4 text-right text-[16px] font-semibold tabular-nums ${flagged ? "text-[#ba1a1a]" : "text-[#191c1d]"}`}>
                      {t.sourceAmount != null ? formatMoney(t.sourceAmount.toNumber(), t.sourceCurrency ?? "USD", "en") : formatMoney(t.amount.toNumber(), t.currency, "en")}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.chip}`}>{st.label}</span>
                    </td>
                    <td className="p-4 text-[13px] text-[#3f4943]">{timeAgo(t.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#bec9c0] bg-[#f3f4f5] px-4 py-4">
          <span className="text-[13px] text-[#3f4943]">Showing {showingFrom}-{showingTo} of {total.toLocaleString("en-US")} transactions</span>
          <div className="flex items-center gap-2">
            <a aria-disabled={!page.hasPrev} href={page.hasPrev ? pageQ(page.page - 1) : undefined} className={`grid h-8 w-8 place-items-center rounded-lg border border-[#bec9c0] ${page.hasPrev ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[#006c49] px-2 text-[12px] font-semibold text-white">{page.page}</span>
            <span className="px-1 text-[13px] text-[#6f7a72]">of {page.totalPages}</span>
            <a aria-disabled={!page.hasNext} href={page.hasNext ? pageQ(page.page + 1) : undefined} className={`grid h-8 w-8 place-items-center rounded-lg border border-[#bec9c0] ${page.hasNext ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Footer widgets */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <div className="flex items-center gap-6 rounded-2xl border border-[#bec9c0]/40 bg-[#e7e8e9]/50 p-6">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white bg-[#006c49]/15 text-[#005136] shadow-lg">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h3 className="text-[16px] font-semibold text-[#005136]">Compliance Status: Healthy</h3>
            <p className="mt-2 text-[14px] text-[#3f4943]">All gateway connectors are performing within expected latency bounds. AML screening is active across corridors. Recent flagging is attributed to high-value remittances.</p>
            <p className="mt-3 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#006c49]">View Compliance Audit <span aria-hidden>→</span></p>
            <p className="mt-2 text-[10px] italic text-[#6f7a72]">Illustrative — no live compliance feed wired.</p>
          </div>
        </div>
        <div className="relative h-[190px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#006c49] via-[#00352a] to-[#0b1220] px-8 py-6 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
            <span className="absolute left-[20%] top-[30%] h-2 w-2 animate-ping rounded-full bg-white" />
            <span className="absolute left-[45%] top-[60%] h-2 w-2 animate-ping rounded-full bg-white" />
            <span className="absolute right-[30%] top-[40%] h-2 w-2 animate-ping rounded-full bg-white" />
          </div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
            Network Status: Live
          </p>
          <h4 className="mt-1 text-[20px] font-semibold">Live Corridor Map</h4>
          <p className="mt-2 text-[13px] opacity-90">Monitoring traffic load between North America, Europe, and Central Asian hubs.</p>
          <p className="absolute bottom-3 right-4 text-[10px] italic text-white/40">Illustrative</p>
        </div>
      </div>
    </div>
  );
}

import { AdminRole } from "@prisma/client";
import { setRequestLocale } from "next-intl/server";
import { ExportUsersCsv, type CsvUser } from "@/components/admin/ExportUsersCsv";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { requireAdmin } from "@/lib/admin";
import { paginate, parsePageParams } from "@/lib/pagination";
import { readPrisma } from "@/lib/prisma-read";
import { createAdminSupabase } from "@/lib/supabase/admin";

function accountAge(createdAt: Date): string {
  const months = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  if (months < 12) return `${months} Month${months === 1 ? "" : "s"}`;
  return `${(months / 12).toFixed(1)} Years`;
}

/** Compact relative time for the activity tables ("Just now", "3 mins ago"). */
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 45) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

function isoDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

function providerLabel(p: string): string {
  const map: Record<string, string> = { google: "Google", email: "Email", github: "GitHub", apple: "Apple", phone: "Phone" };
  return map[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Email");
}

/** A sign-in within the last 10 minutes is highlighted as "recent". */
function isRecent(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 10 * 60 * 1000;
}

type Status = "verified" | "pending" | "flagged";
function statusOf(u: { suspended: boolean; onboardedAt: Date | null }): Status {
  if (u.suspended) return "flagged";
  if (!u.onboardedAt) return "pending";
  return "verified";
}
const STATUS_STYLE: Record<Status, { label: string; chip: string; dot: string; bar: string; text: string }> = {
  verified: { label: "Verified", chip: "bg-[#006c49]/10 text-[#005136]", dot: "bg-[#006c49]", bar: "bg-[#006c49]", text: "text-[#005136]" },
  pending: { label: "Pending", chip: "bg-[#fed65b]/25 text-[#745c00]", dot: "bg-[#735c00] animate-pulse", bar: "bg-[#735c00]", text: "text-[#735c00]" },
  flagged: { label: "Flagged", chip: "bg-[#ffdad6]/50 text-[#ba1a1a]", dot: "bg-[#ba1a1a]", bar: "bg-[#772f2c]", text: "text-[#772f2c]" },
};

export default async function AdminUsersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; status?: string };
}) {
  setRequestLocale(locale);
  const admin = await requireAdmin();

  const statusFilter = (["verified", "pending", "flagged"] as const).includes(searchParams.status as never)
    ? (searchParams.status as Status)
    : "all";
  const params = parsePageParams({ page: searchParams.page }, { defaultSize: 10 });

  // Status maps onto real columns: flagged = suspended; pending = never
  // onboarded; verified = onboarded & active.
  const where =
    statusFilter === "flagged"
      ? { suspended: true }
      : statusFilter === "pending"
        ? { suspended: false, onboardedAt: null }
        : statusFilter === "verified"
          ? { suspended: false, onboardedAt: { not: null } }
          : {};

  let page = { items: [] as Awaited<ReturnType<typeof loadUsers>>["items"], page: 1, pageSize: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
  let trustAvg = 0;
  let pendingCount = 0;
  let dataError = false;

  async function loadUsers() {
    return paginate(params, {
      count: () => readPrisma.user.count({ where }),
      findMany: ({ skip, take }) =>
        readPrisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, image: true, createdAt: true, adminRole: true, suspended: true, onboardedAt: true, householdId: true },
        }),
    });
  }

  try {
    const [p, avgAgg, pending] = await Promise.all([
      loadUsers(),
      readPrisma.trustScoreSnapshot.aggregate({ _avg: { score: true } }),
      readPrisma.user.count({ where: { onboardedAt: null, suspended: false } }),
    ]);
    page = p;
    trustAvg = Math.round((avgAgg._avg.score ?? 0) * 10) / 10;
    pendingCount = pending;
  } catch (e) {
    console.error("admin users data unavailable", e);
    dataError = true;
  }

  // Latest trust snapshot per household → per-user trust score.
  const householdIds = Array.from(new Set(page.items.map((u) => u.householdId)));
  const trustByHousehold = new Map<string, number>();
  if (householdIds.length > 0 && !dataError) {
    try {
      const snaps = await readPrisma.trustScoreSnapshot.findMany({
        where: { householdId: { in: householdIds } },
        orderBy: { calculatedAt: "desc" },
        select: { householdId: true, score: true },
      });
      for (const s of snaps) if (!trustByHousehold.has(s.householdId)) trustByHousehold.set(s.householdId, s.score);
    } catch { /* trust column optional */ }
  }

  // ── Activity tracking (Supabase, service-role — bypasses RLS) ────────────
  type VisitRow = { email: string | null; path: string | null; created_at: string };
  type SignInRow = { id: string; email: string; provider: string; created_at: string; last_sign_in_at: string | null };

  const supaAdmin = createAdminSupabase();
  const activityConfigured = supaAdmin !== null;
  let visits: VisitRow[] = [];
  let signIns: SignInRow[] = [];

  if (supaAdmin) {
    const [logsRes, usersRes] = await Promise.allSettled([
      supaAdmin
        .from("activity_logs")
        .select("email, path, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      supaAdmin.auth.admin.listUsers({ page: 1, perPage: 25 }),
    ]);

    if (logsRes.status === "fulfilled" && !logsRes.value.error) {
      visits = (logsRes.value.data ?? []) as VisitRow[];
    } else {
      console.error("activity_logs fetch failed", logsRes.status === "fulfilled" ? logsRes.value.error : logsRes.reason);
    }

    if (usersRes.status === "fulfilled" && !usersRes.value.error) {
      signIns = usersRes.value.data.users.map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        provider: (u.app_metadata?.provider as string | undefined) ?? "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }));
    } else {
      console.error("listUsers failed", usersRes.status === "fulfilled" ? usersRes.value.error : usersRes.reason);
    }
  }

  const total = page.total;
  const showingFrom = total === 0 ? 0 : params.skip + 1;
  const showingTo = Math.min(params.skip + params.pageSize, total);

  const q = (over: { page?: number; status?: string }) => {
    const p = new URLSearchParams();
    const st = over.status ?? (statusFilter === "all" ? undefined : statusFilter);
    if (st) p.set("status", st);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };

  const csvRows: CsvUser[] = page.items.map((u) => ({
    name: u.name,
    email: u.email,
    accountAge: accountAge(u.createdAt),
    trust: trustByHousehold.get(u.householdId) ?? null,
    status: STATUS_STYLE[statusOf(u)].label,
    admin: u.adminRole === AdminRole.ADMIN,
  }));

  const STATUS_TABS: { key: "all" | Status; label: string }[] = [
    { key: "all", label: "All" },
    { key: "verified", label: "Verified" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h3 className="text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">User Management</h3>
          <p className="text-[14px] text-[#3f4943]">Reviewing {total.toLocaleString("en-US")} corridor participant{total === 1 ? "" : "s"}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943]">Region:</span>
            <span className="cursor-not-allowed text-[14px] text-[#6f7a72]" title="Region data not tracked yet">All Regions</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943]">Status:</span>
            <div className="flex gap-1">
              {STATUS_TABS.map((t) => {
                const active = statusFilter === t.key;
                return (
                  <a key={t.key} href={q({ status: t.key === "all" ? undefined : t.key, page: 1 })} className={`rounded px-2 py-0.5 text-[13px] transition-all ${active ? "bg-[#006c49] font-bold text-white" : "text-[#3f4943] hover:bg-[#e7e8e9]"}`}>
                    {t.label}
                  </a>
                );
              })}
            </div>
          </div>
          <ExportUsersCsv rows={csvRows} />
        </div>
      </div>

      {dataError && (
        <div className="rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-4 py-3 text-[13px] text-[#93000a]">User data is temporarily unavailable (database waking up). Refresh in a moment.</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#bec9c0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#bec9c0] bg-[#edeeef]">
                {["User Profile", "Country", "Account Age", "Trust Score", "Status", "Actions"].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] ${i === 3 ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec9c0]">
              {page.items.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#6f7a72]">No users match this filter.</td></tr>
              )}
              {page.items.map((u, i) => {
                const st = STATUS_STYLE[statusOf(u)];
                const trust = trustByHousehold.get(u.householdId);
                const initial = (u.name || u.email || "?").trim().charAt(0).toUpperCase();
                return (
                  <tr key={u.id} className={`group transition-colors hover:bg-[#006c49]/5 ${i % 2 === 1 ? "bg-[#f3f4f5]" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt="" className="h-10 w-10 shrink-0 rounded-full border-2 border-[#006c49] object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#bec9c0] bg-[#006c49]/10 text-sm font-bold text-[#005136]">{initial}</span>
                        )}
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2 text-[14px] font-bold text-[#191c1d]">
                            {u.name}
                            {u.adminRole === AdminRole.ADMIN && <span className="rounded bg-[#006c49]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#005136]">Admin</span>}
                          </span>
                          <span className="text-[13px] text-[#3f4943]">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#6f7a72]" title="Country not tracked in this build">—</td>
                    <td className="px-6 py-4 text-[14px] text-[#3f4943]">{accountAge(u.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[13px] font-bold tabular-nums ${trust != null ? st.text : "text-[#6f7a72]"}`}>{trust != null ? `${trust} / 100` : "—"}</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#bec9c0]">
                          <div className={`h-full ${st.bar}`} style={{ width: `${trust ?? 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <UserRowActions userId={u.id} isAdmin={u.adminRole === AdminRole.ADMIN} suspended={u.suspended} isSelf={u.id === admin.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#bec9c0] bg-[#f3f4f5] px-6 py-4">
          <span className="text-[13px] text-[#3f4943]">Showing {showingFrom}-{showingTo} of {total.toLocaleString("en-US")} users</span>
          <div className="flex items-center gap-2">
            <a aria-disabled={!page.hasPrev} href={page.hasPrev ? q({ page: page.page - 1 }) : undefined} className={`grid h-8 w-8 place-items-center rounded border border-[#bec9c0] bg-white ${page.hasPrev ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <span className="grid h-8 min-w-8 place-items-center rounded border border-[#006c49] bg-[#006c49] px-2 text-[12px] font-semibold text-white">{page.page}</span>
            <span className="px-1 text-[13px] text-[#6f7a72]">of {page.totalPages}</span>
            <a aria-disabled={!page.hasNext} href={page.hasNext ? q({ page: page.page + 1 }) : undefined} className={`grid h-8 w-8 place-items-center rounded border border-[#bec9c0] bg-white ${page.hasNext ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Activity tracking: recent sign-ins + live page visits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Sign-Ins & Status */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#bec9c0] bg-[#edeeef] px-6 py-4">
            <h4 className="text-[16px] font-semibold text-[#191c1d]">User Sign-Ins &amp; Status</h4>
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943]">Recent Auth</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#bec9c0] bg-[#f3f4f5]">
                  {["Email", "Provider", "Created", "Last Sign-In"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#3f4943]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec9c0]">
                {!activityConfigured && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-[#6f7a72]">Set <code className="rounded bg-[#edeeef] px-1">SUPABASE_SERVICE_ROLE_KEY</code> to load sign-in data.</td></tr>
                )}
                {activityConfigured && signIns.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-[#6f7a72]">No registered users yet.</td></tr>
                )}
                {signIns.map((u, i) => (
                  <tr key={u.id} className={`transition-colors hover:bg-[#006c49]/5 ${i % 2 === 1 ? "bg-[#f3f4f5]" : ""}`}>
                    <td className="px-4 py-3 text-[13px] text-[#191c1d]">{u.email}</td>
                    <td className="px-4 py-3"><span className="rounded bg-[#e7e8e9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3f4943]">{providerLabel(u.provider)}</span></td>
                    <td className="px-4 py-3 text-[13px] text-[#6f7a72]">{isoDate(u.created_at)}</td>
                    <td className={`px-4 py-3 text-[13px] ${isRecent(u.last_sign_in_at) ? "font-medium text-[#006c49]" : "text-[#3f4943]"}`}>{timeAgo(u.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Page Visits */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#bec9c0] bg-[#edeeef] px-6 py-4">
            <div className="flex items-center gap-2">
              <h4 className="text-[16px] font-semibold text-[#191c1d]">Live Page Visits</h4>
              <span className="h-2 w-2 animate-ping rounded-full bg-[#006c49]" />
            </div>
            <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#006c49]">Live</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#bec9c0] bg-[#f3f4f5]">
                  {["User Email", "Visited Path", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#3f4943]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec9c0]">
                {!activityConfigured && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-[13px] text-[#6f7a72]">Set <code className="rounded bg-[#edeeef] px-1">SUPABASE_SERVICE_ROLE_KEY</code> to load visit data.</td></tr>
                )}
                {activityConfigured && visits.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-[13px] text-[#6f7a72]">No page visits recorded yet.</td></tr>
                )}
                {visits.map((v, i) => (
                  <tr key={i} className={`transition-colors hover:bg-[#006c49]/5 ${i % 2 === 1 ? "bg-[#f3f4f5]" : ""}`}>
                    <td className="px-4 py-3 text-[13px] text-[#191c1d]">{v.email ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] font-medium text-[#006c49]">{v.path ?? "/"}</td>
                    <td className="px-4 py-3 text-[13px] text-[#3f4943]">{timeAgo(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Global Trust Index</span>
            <span className="flex items-center gap-1 text-[13px] font-bold text-[#006c49]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              +4.2%
            </span>
          </div>
          <h4 className="text-[20px] font-semibold tabular-nums text-[#191c1d]">{trustAvg || "—"} Avg</h4>
          <svg viewBox="0 0 300 80" className="mt-6 h-16 w-full overflow-visible">
            <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#006c49" stopOpacity="0.2" /><stop offset="1" stopColor="#006c49" stopOpacity="0" /></linearGradient></defs>
            <path d="M0 60 Q40 50 80 55 T160 40 T240 30 T300 15 V80 H0 Z" fill="url(#tg)" />
            <path d="M0 60 Q40 50 80 55 T160 40 T240 30 T300 15" fill="none" stroke="#006c49" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="mt-2 text-[10px] italic text-[#6f7a72]">Average of recorded trust snapshots.</p>
        </div>

        <div className="rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm">
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Pending Verification</span>
          <div className="flex items-baseline gap-2"><h4 className="text-[20px] font-semibold tabular-nums text-[#191c1d]">{pendingCount.toLocaleString("en-US")}</h4><span className="text-[13px] text-[#3f4943]">users in queue</span></div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-3">
              {["JD", "MK", "SL"].map((x, i) => (
                <span key={x} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold ${["bg-[#edeeef]", "bg-[#006c49]/20 text-[#005136]", "bg-[#fed65b] text-[#745c00]"][i]}`}>{x}</span>
              ))}
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#bec9c0] text-[10px] font-bold text-[#191c1d]">+{Math.max(0, pendingCount - 3)}</span>
            </div>
            <a href={q({ status: "pending", page: 1 })} className="text-[12px] font-semibold text-[#006c49] hover:underline">Process Batch</a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm">
          <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">Live Ecosystem Load</span>
          <h4 className="text-[20px] font-semibold text-[#191c1d]">8.4k Concurrent</h4>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#006c49]" />
            <span className="text-[13px] font-medium text-[#006c49]">Real-time monitoring active</span>
          </div>
          <p className="mt-2 text-[10px] italic text-[#6f7a72]">Illustrative</p>
        </div>
      </div>
    </div>
  );
}

import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/admin";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { emailFor } from "@/lib/mask";
import { paginate, parsePageParams } from "@/lib/pagination";
import { readPrisma } from "@/lib/prisma-read";
import { AuditRow } from "@/components/admin/AuditRow";

export const dynamic = "force-dynamic";

/**
 * The audit trail.
 *
 * Previously the only view of this was the last 8 rows embedded in Settings,
 * which is fine as a glance and useless as an investigation. This is the full
 * trail: filterable by action, actor and date, paginated, with the before/after
 * of each change expandable inline.
 *
 * Read-only by construction — `AuditLog` is append-only and nothing here
 * writes. Gated on `settings.view`, so SUPPORT cannot reach it.
 */

/** Groups for the action filter, so the dropdown reads as jobs not slugs. */
const ACTION_GROUPS: Array<{ label: string; actions: readonly string[] }> = [
  { label: "Staff & access", actions: ["ROLE_CHANGE", "ROLE_PROMOTION", "ROLE_DEMOTION", "USER_SUSPEND", "USER_UNSUSPEND"] },
  { label: "Money", actions: ["TRANSACTION_CONFIRM", "TRANSACTION_FAIL", "TRANSACTION_DISPUTE", "TRANSACTION_RESOLVE", "TRANSACTION_REVERSE"] },
  { label: "Data", actions: ["DATA_EXPORT"] },
];

function startOfDay(value: string): Date | null {
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(value: string): Date | null {
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function AdminAuditPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; action?: string; actor?: string; from?: string; to?: string };
}) {
  setRequestLocale(locale);
  const staff = await requireStaff("settings.view");
  const canSeePii = staff.can("customer.pii.view");

  // Whitelisted against the same list the writers use, so an unknown value
  // simply means "no filter" rather than an error.
  const action = AUDIT_ACTIONS.includes(searchParams.action as never) ? searchParams.action : undefined;
  const actor = (searchParams.actor ?? "").trim();
  const from = searchParams.from ? startOfDay(searchParams.from) : null;
  const to = searchParams.to ? endOfDay(searchParams.to) : null;

  const where = {
    ...(action ? { action } : {}),
    ...(actor
      ? {
          admin: {
            OR: [
              { name: { contains: actor, mode: "insensitive" as const } },
              { email: { contains: actor, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const params = parsePageParams({ page: searchParams.page }, { defaultSize: 25 });

  let page = {
    items: [] as Awaited<ReturnType<typeof load>>["items"],
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
  let dataError = false;

  async function load() {
    return paginate(params, {
      count: () => readPrisma.auditLog.count({ where }),
      findMany: ({ skip, take }) =>
        readPrisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            role: true,
            targetUserId: true,
            targetType: true,
            before: true,
            after: true,
            ip: true,
            metadata: true,
            createdAt: true,
            admin: { select: { name: true, email: true } },
          },
        }),
    });
  }

  try {
    page = await load();
  } catch (e) {
    console.error("audit log unavailable", e);
    dataError = true;
  }

  const total = page.total;
  const showingFrom = total === 0 ? 0 : params.skip + 1;
  const showingTo = Math.min(params.skip + params.pageSize, total);

  const q = (over: { page?: number }) => {
    const p = new URLSearchParams();
    if (action) p.set("action", action);
    if (actor) p.set("actor", actor);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };

  const selCls =
    "w-full rounded-lg border border-[#bec9c0] bg-[#f3f4f5] px-3 py-2 text-[14px] text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">Audit Trail</h1>
        <p className="text-[14px] text-[#3f4943]">
          Every privileged action, append-only. {total.toLocaleString("en-US")} entr{total === 1 ? "y" : "ies"}.
        </p>
      </div>

      {/* Filters — a plain GET form, so it works without JS and is linkable. */}
      <form method="get" className="flex flex-wrap items-end gap-4 rounded-xl border border-[#bec9c0] bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="f-action" className="mb-1 ml-1 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">
            Action
          </label>
          <select id="f-action" name="action" defaultValue={action ?? ""} className={selCls}>
            <option value="">All actions</option>
            {ACTION_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.actions.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="f-actor" className="mb-1 ml-1 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">
            Operator
          </label>
          <input id="f-actor" name="actor" defaultValue={actor} placeholder="Name or email" className={selCls} />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="f-from" className="mb-1 ml-1 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">
            From
          </label>
          <input id="f-from" type="date" name="from" defaultValue={searchParams.from ?? ""} className={selCls} />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="f-to" className="mb-1 ml-1 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6f7a72]">
            To
          </label>
          <input id="f-to" type="date" name="to" defaultValue={searchParams.to ?? ""} className={selCls} />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#006c49] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#005136]"
        >
          Apply
        </button>
        <a
          href="?"
          className="rounded-lg border border-[#bec9c0] px-4 py-2 text-[13px] font-semibold text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
        >
          Reset
        </a>
      </form>

      {dataError && (
        <div className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/30 p-4 text-[13px] text-[#ba1a1a]">
          The audit log is temporarily unavailable.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#bec9c0] bg-white shadow-sm">
        <div className="divide-y divide-[#bec9c0]">
          {page.items.length === 0 && !dataError && (
            <p className="px-6 py-12 text-center text-[14px] text-[#6f7a72]">
              No entries match these filters.
            </p>
          )}
          {page.items.map((row) => (
            <AuditRow
              key={row.id}
              action={row.action}
              actor={row.admin?.name || emailFor(row.admin?.email ?? "—", canSeePii)}
              actorRole={row.role}
              targetType={row.targetType}
              targetUserId={row.targetUserId}
              ip={row.ip}
              createdAtIso={row.createdAt.toISOString()}
              before={row.before as unknown}
              after={row.after as unknown}
              metadata={row.metadata as unknown}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#bec9c0] bg-[#f3f4f5] px-6 py-4">
          <span className="text-[13px] text-[#3f4943]">
            Showing {showingFrom}-{showingTo} of {total.toLocaleString("en-US")}
          </span>
          <div className="flex items-center gap-2">
            <a
              aria-disabled={!page.hasPrev}
              href={page.hasPrev ? q({ page: page.page - 1 }) : undefined}
              className={`grid h-8 w-8 place-items-center rounded border border-[#bec9c0] bg-white ${page.hasPrev ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <span className="grid h-8 min-w-8 place-items-center rounded border border-[#006c49] bg-[#006c49] px-2 text-[12px] font-semibold text-white">
              {page.page}
            </span>
            <span className="px-1 text-[13px] text-[#6f7a72]">of {page.totalPages}</span>
            <a
              aria-disabled={!page.hasNext}
              href={page.hasNext ? q({ page: page.page + 1 }) : undefined}
              className={`grid h-8 w-8 place-items-center rounded border border-[#bec9c0] bg-white ${page.hasNext ? "hover:bg-[#e7e8e9]" : "pointer-events-none opacity-50"}`}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

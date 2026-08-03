import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/admin";
import { getMonthSummary } from "@/lib/budget-data";
import { formatMoney } from "@/lib/format";
import { IMPERSONATION_TTL_MINUTES } from "@/lib/impersonation";
import { emailFor, nameFor } from "@/lib/mask";
import { toMinor, type Minor } from "@/lib/money";
import { ROLE_LABELS } from "@/lib/permissions";
import { readPrisma } from "@/lib/prisma-read";
import { getTrustData } from "@/lib/trust-data";
import { ViewAsUserButton } from "@/components/admin/ViewAsUserButton";
import { TrustOverrideForm } from "@/components/admin/TrustOverrideForm";
import { StaffRoleSelect } from "@/components/admin/StaffRoleSelect";

/**
 * User 360 — everything the platform knows about one customer, on one screen.
 *
 * The point is to answer a support call without four tabs open. What it shows
 * is strictly what exists: where a section has no data source yet it says so
 * rather than rendering a plausible-looking placeholder, because an operator
 * reading a fabricated "KYC: Verified" would act on it.
 */

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  COMPLETED: "bg-[#006c49]/10 text-[#005136]",
  PENDING: "bg-[#fed65b]/25 text-[#745c00]",
  FAILED: "bg-[#ffdad6]/50 text-[#ba1a1a]",
  DISPUTED: "bg-[#772f2c]/10 text-[#772f2c]",
  REVERSED: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
};

function Card({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#bec9c0] bg-white">
      <header className="flex items-center justify-between border-b border-[#bec9c0] px-5 py-3.5">
        <h2 className="text-[14px] font-bold text-[#191c1d]">{title}</h2>
        {aside}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** A section with nothing behind it yet — named honestly, not mocked up. */
function NotTracked({ what, why }: { what: string; why: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#bec9c0] bg-[#f8f9fa] px-4 py-5 text-center">
      <p className="text-[13px] font-semibold text-[#3f4943]">{what}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-[#6f7a72]">{why}</p>
    </div>
  );
}

function when(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export default async function User360Page({
  params: { locale, userId },
}: {
  params: { locale: string; userId: string };
}) {
  setRequestLocale(locale);
  const staff = await requireStaff("customer.view");
  const canSeePii = staff.can("customer.pii.view");
  const canImpersonate = staff.can("customer.impersonate");
  const canOverrideTrust = staff.can("trustscore.override");
  const canManageStaff = staff.can("staff.manage");

  const user = await readPrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accessRole: true,
      adminRole: true,
      suspended: true,
      onboardedAt: true,
      createdAt: true,
      householdId: true,
      household: {
        select: {
          id: true,
          name: true,
          currency: true,
          inviteCode: true,
          users: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, email: true, role: true, accessRole: true, suspended: true },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const period = new Date().toISOString().slice(0, 7);
  const [transactions, trust, summary, auditRows, actorEvents] = await Promise.all([
    readPrisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { date: "desc" },
      take: 15,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        date: true,
        provider: { select: { name: true } },
      },
    }),
    getTrustData(user.householdId),
    getMonthSummary(user.householdId, period),
    // Operator actions taken ON this customer.
    readPrisma.auditLog.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, role: true, createdAt: true, adminId: true },
    }),
    // State changes this customer authored themselves.
    readPrisma.transactionEvent.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        event: true,
        fromStatus: true,
        toStatus: true,
        reasonCode: true,
        createdAt: true,
      },
    }),
  ]);

  const displayName = nameFor(user.name, canSeePii);
  const status = user.suspended ? "Suspended" : user.onboardedAt ? "Active" : "Not onboarded";
  const statusChip = user.suspended
    ? "bg-[#ffdad6]/50 text-[#ba1a1a]"
    : user.onboardedAt
      ? "bg-[#006c49]/10 text-[#005136]"
      : "bg-[#fed65b]/25 text-[#745c00]";

  const factors = [
    { key: "Consistency", f: trust.result.consistency },
    { key: "Stability", f: trust.result.stability },
    { key: "Savings", f: trust.result.savings },
  ];
  // `getMonthSummary` already returns minor units; only raw Prisma columns
  // need `toMinor`.
  const money = (v: Minor) => formatMoney(v, user.household.currency, "en");

  return (
    <div className="space-y-5 pb-10">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/${locale}/admin/users`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#006c49] hover:underline"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All users
          </Link>
          <h1 className="mt-1.5 truncate text-[24px] font-bold text-[#191c1d]">{displayName}</h1>
          <p className="mt-0.5 text-[13px] text-[#6f7a72]">
            {emailFor(user.email, canSeePii)} · {user.role === "SENDER" ? "Sender" : "Receiver"} ·
            joined {when(user.createdAt).slice(0, 10)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusChip}`}>
            {status}
          </span>
          {canImpersonate && user.adminRole === "USER" && !user.suspended && (
            <ViewAsUserButton
              userId={user.id}
              userName={displayName}
              locale={locale}
              ttlMinutes={IMPERSONATION_TTL_MINUTES}
            />
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column -------------------------------------------------- */}
        <div className="space-y-5 lg:col-span-2">
          <Card title="Recent transactions">
            {transactions.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[#6f7a72]">
                No transactions recorded against this account.
              </p>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-[#bec9c0] text-[11px] uppercase tracking-wide text-[#6f7a72]">
                      <th className="px-5 py-2 font-semibold">Date</th>
                      <th className="px-5 py-2 font-semibold">Type</th>
                      <th className="px-5 py-2 font-semibold">Amount</th>
                      <th className="px-5 py-2 font-semibold">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bec9c0]/50">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="px-5 py-2.5 text-[13px] tabular-nums text-[#3f4943]">
                          {when(t.date).slice(0, 10)}
                        </td>
                        <td className="px-5 py-2.5 text-[13px] text-[#191c1d]">
                          {t.type.toLowerCase()}
                          {t.provider && <span className="text-[#6f7a72]"> · {t.provider.name}</span>}
                        </td>
                        <td className="px-5 py-2.5 text-[13px] font-semibold tabular-nums text-[#191c1d]">
                          {formatMoney(toMinor(t.amount), t.currency, "en")}
                        </td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              STATUS_CHIP[t.status] ?? "bg-[#e7e8e9] text-[#3f4943]"
                            }`}
                          >
                            {t.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Trust Score inspector ------------------------------------- */}
          <Card
            title="Trust Score"
            aside={
              <span className="text-[11px] text-[#6f7a72]">
                {trust.result.hasEnoughData
                  ? `${trust.result.windowMonths.length}-month window`
                  : "Provisional — under 3 months of history"}
              </span>
            }
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[40px] font-bold leading-none tabular-nums text-[#191c1d]">
                {trust.score}
              </span>
              {trust.override ? (
                <span className="text-[13px] text-[#6f7a72]">
                  {trust.result.score} computed{" "}
                  <span className={trust.override.delta > 0 ? "text-[#005136]" : "text-[#ba1a1a]"}>
                    {trust.override.delta > 0 ? "+" : "−"}
                    {Math.abs(trust.override.delta)} adjustment
                  </span>{" "}
                  by {trust.override.actorName}
                </span>
              ) : (
                <span className="text-[13px] text-[#6f7a72]">entirely computed from the ledger</span>
              )}
            </div>

            {/* Factor breakdown: sub-score × weight → contribution. */}
            <div className="mt-5 space-y-3">
              {factors.map(({ key, f }) => (
                <div key={key}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="font-semibold text-[#3f4943]">
                      {key}{" "}
                      <span className="font-normal text-[#6f7a72]">
                        × {Math.round(f.weight * 100)}%
                      </span>
                    </span>
                    <span className="tabular-nums text-[#191c1d]">
                      {f.score} → {Math.round(f.score * f.weight)} pts
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e7e8e9]">
                    <div className="h-full rounded-full bg-[#006c49]" style={{ width: `${f.score}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#6f7a72]">
                    {Object.entries(f.details)
                      .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${v}`)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              {canOverrideTrust ? (
                <TrustOverrideForm
                  householdId={user.householdId}
                  baseScore={trust.result.score}
                  activeOverride={
                    trust.override
                      ? {
                          id: trust.override.id,
                          delta: trust.override.delta,
                          reasonCode: String(trust.override.reasonCode),
                          reason: trust.override.reason,
                        }
                      : null
                  }
                />
              ) : (
                <p className="rounded-lg bg-[#f3f4f5] px-3 py-2 text-[12px] text-[#6f7a72]">
                  Adjusting a Trust Score requires super-admin access.
                </p>
              )}
            </div>
          </Card>

          <Card title="Operator history">
            {auditRows.length === 0 && actorEvents.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[#6f7a72]">
                No staff action has been recorded against this account.
              </p>
            ) : (
              <ul className="space-y-2">
                {auditRows.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="font-semibold text-[#191c1d]">
                        {a.action.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="text-[#6f7a72]">
                        {" "}
                        by staff {a.adminId.slice(-8)}
                        {a.role ? ` (${a.role.replace(/_/g, " ").toLowerCase()})` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[#6f7a72]">
                      {when(a.createdAt)}
                    </span>
                  </li>
                ))}
                {actorEvents.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="font-semibold text-[#191c1d]">{e.event.toLowerCase()}</span>
                      <span className="text-[#6f7a72]">
                        {" "}
                        {e.fromStatus} → {e.toStatus}
                        {e.reasonCode ? ` · ${e.reasonCode.toLowerCase()}` : ""} — by the customer
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[#6f7a72]">
                      {when(e.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-[#bec9c0]/50 pt-3 text-[11px] text-[#6f7a72]">
              Staff entries come from the audit log; the rest are transaction state changes this
              customer made themselves.{" "}
              <Link href={`/${locale}/admin/audit`} className="font-semibold text-[#006c49] hover:underline">
                Full audit log
              </Link>
            </p>
          </Card>
        </div>

        {/* Right column ------------------------------------------------- */}
        <div className="space-y-5">
          <Card title="Household">
            <p className="text-[13px] font-semibold text-[#191c1d]">{user.household.name}</p>
            <p className="mt-0.5 text-[12px] text-[#6f7a72]">
              Invite code {canSeePii ? user.household.inviteCode : "••••••••"} · {user.household.currency}
            </p>
            <ul className="mt-4 space-y-2.5">
              {user.household.users.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-[#191c1d]">
                      {nameFor(m.name, canSeePii)}
                      {m.id === user.id && <span className="text-[#6f7a72]"> — this user</span>}
                    </span>
                    <span className="block truncate text-[11px] text-[#6f7a72]">
                      {m.role === "SENDER" ? "Sender" : "Receiver"} ·{" "}
                      {m.accessRole === "ADMIN" ? "Household admin" : "Viewer"}
                      {m.suspended ? " · suspended" : ""}
                    </span>
                  </span>
                  {m.id !== user.id && (
                    <Link
                      href={`/${locale}/admin/users/${m.id}`}
                      className="shrink-0 text-[11px] font-semibold text-[#006c49] hover:underline"
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="This month">
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[#6f7a72]">Received</dt>
                <dd className="font-semibold tabular-nums text-[#191c1d]">{money(summary.incomeUzs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6f7a72]">Spent</dt>
                <dd className="font-semibold tabular-nums text-[#191c1d]">{money(summary.spentUzs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6f7a72]">Saved</dt>
                <dd className="font-semibold tabular-nums text-[#191c1d]">{money(summary.savedUzs)}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-[#bec9c0]/50 pt-2.5 text-[11px] text-[#6f7a72]">
              Household totals for {period}, not this member&rsquo;s alone — budgets are shared.
            </p>
          </Card>

          <Card title="Access">
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#6f7a72]">Platform tier</dt>
                <dd className="font-semibold text-[#191c1d]">
                  {canManageStaff ? (
                    <StaffRoleSelect
                      userId={user.id}
                      currentRole={user.adminRole}
                      isSelf={user.id === staff.id}
                    />
                  ) : (
                    ROLE_LABELS[user.adminRole]
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#6f7a72]">Household role</dt>
                <dd className="font-semibold text-[#191c1d]">
                  {user.accessRole === "ADMIN" ? "Admin" : "Viewer"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#6f7a72]">Onboarded</dt>
                <dd className="font-semibold text-[#191c1d]">
                  {user.onboardedAt ? when(user.onboardedAt).slice(0, 10) : "Never"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Identity verification">
            <NotTracked
              what="No KYC record"
              why="There is no KYC model in this build. The Verified / Pending / Flagged labels elsewhere in the panel are derived from onboarding and suspension only — they are not identity checks."
            />
          </Card>

          <Card title="Support contacts">
            <NotTracked
              what="No ticket history"
              why="Ticket permissions exist but no ticket model does yet, so past conversations with this customer are not recorded anywhere the panel can read."
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

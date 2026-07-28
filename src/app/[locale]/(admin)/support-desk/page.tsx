import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import { emailFor, nameFor } from "@/lib/mask";
import { toMinor } from "@/lib/money";
import { readPrisma } from "@/lib/prisma-read";

export const dynamic = "force-dynamic";

const CARD = "rounded-xl border border-[#bec9c0] bg-white";

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function timeAgo(d: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STATUS_CHIP: Record<string, string> = {
  COMPLETED: "bg-[#006c49]/10 text-[#006c49]",
  PENDING: "bg-[#fed65b]/40 text-[#745c00]",
  FAILED: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  DISPUTED: "bg-[#772f2c]/10 text-[#772f2c]",
  REVERSED: "bg-[#bec9c0]/40 text-[#3f4943]",
};

/**
 * Support desk: find a customer, see their context, act.
 *
 * Everything shown here is read-only in this PR — the ticket backend lands
 * next and will add reply/assign/resolve on top of the permissions that
 * already exist (`ticket.*`).
 *
 * PII is masked unless the viewer holds `customer.pii.view`, so a support seat
 * shows enough to confirm who is on the phone and no more.
 */
export default async function SupportDeskPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string };
}) {
  setRequestLocale(locale);
  const staff = await requireStaff("ticket.view");
  const canSeePii = staff.can("customer.pii.view");

  const q = (searchParams.q ?? "").trim();

  const matches = q
    ? await readPrisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          suspended: true,
          onboardedAt: true,
          householdId: true,
        },
      })
    : [];

  // Context for a single match: their household's recent transfers, so an
  // agent answering "did my money arrive?" has the answer on screen.
  const focus = matches.length === 1 ? matches[0] : null;
  const recent = focus
    ? await readPrisma.transaction.findMany({
        where: { householdId: focus.householdId, type: "REMITTANCE" },
        orderBy: { date: "desc" },
        take: 6,
        select: { id: true, status: true, amount: true, currency: true, sourceCurrency: true, date: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className={`${CARD} p-6`}>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">Support Desk</h1>
        <p className="mt-1 text-[14px] text-[#3f4943]">
          Find a customer above to see their account and recent transfers.
          {!canSeePii && " Contact details are masked for your role."}
        </p>
      </div>

      {q === "" ? (
        <div className={`${CARD} p-10 text-center`}>
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#edeeef] text-[#6f7a72]">
            <Glyph d="M11 4a7 7 0 104.2 12.6L20 21m-4.8-4.4A7 7 0 0011 4z" className="h-6 w-6" />
          </span>
          <p className="text-[15px] font-semibold text-[#191c1d]">Start with a customer</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-[#3f4943]">
            Search by name or email. Ticket handling arrives in the next release —
            this desk currently gives you the account context to answer a call.
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className={`${CARD} p-10 text-center`}>
          <p className="text-[15px] font-semibold text-[#191c1d]">No customer matches “{q}”.</p>
          <p className="mt-1 text-[13px] text-[#3f4943]">Try a different spelling, or search their email.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`${CARD} overflow-hidden`}>
            <div className="border-b border-[#bec9c0] bg-[#edeeef] px-5 py-3">
              <h2 className="text-[15px] font-semibold text-[#191c1d]">
                {matches.length} match{matches.length === 1 ? "" : "es"}
              </h2>
            </div>
            <ul className="divide-y divide-[#bec9c0]">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#006c49]/10 text-[13px] font-bold text-[#006c49]">
                    {m.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[#191c1d]">
                      {nameFor(m.name, canSeePii)}
                    </span>
                    <span className="block truncate text-[13px] text-[#3f4943]">
                      {emailFor(m.email, canSeePii)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      m.suspended
                        ? "bg-[#ba1a1a]/10 text-[#ba1a1a]"
                        : m.onboardedAt
                          ? "bg-[#006c49]/10 text-[#006c49]"
                          : "bg-[#fed65b]/40 text-[#745c00]"
                    }`}
                  >
                    {m.suspended ? "Suspended" : m.onboardedAt ? "Active" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${CARD} overflow-hidden`}>
            <div className="border-b border-[#bec9c0] bg-[#edeeef] px-5 py-3">
              <h2 className="text-[15px] font-semibold text-[#191c1d]">Recent transfers</h2>
            </div>
            {!focus ? (
              <p className="px-5 py-8 text-center text-[13px] text-[#6f7a72]">
                Narrow the search to one customer to see their transfers.
              </p>
            ) : recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-[#6f7a72]">
                No transfers on this household yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#bec9c0]">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#191c1d]">
                        {formatMoney(toMinor(t.amount), t.currency, "en")}
                      </span>
                      <span className="block text-[12px] text-[#3f4943]">
                        {t.sourceCurrency ? `${t.sourceCurrency} → UZS` : "Ledger"} · {timeAgo(t.date)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        STATUS_CHIP[t.status] ?? STATUS_CHIP.PENDING
                      }`}
                    >
                      {t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {focus && staff.can("transaction.view") && (
              <div className="border-t border-[#bec9c0] p-3 text-center">
                <Link
                  href={`/${locale}/admin/transactions`}
                  className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#006c49] hover:underline"
                >
                  Open transaction monitor
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

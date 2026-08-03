"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  assignTicket,
  rebalanceTickets,
  reopenTicket,
  replyToTicket,
  requestKyc,
  resolveTicket,
} from "@/app/actions/tickets";
import { toast } from "@/components/ui/toast";
import { distributionShape } from "@/lib/ticket-assignment";
import { allowedTicketEvents, type TicketStatus } from "@/lib/ticket-state";

/**
 * Support operations console.
 *
 * Was an illustrative mock over a hardcoded ticket array — the controls had
 * nothing to act on. It now renders real `SupportTicket` rows, and every
 * button calls a permission-guarded, audited server action.
 *
 * Which controls are enabled comes from `allowedTicketEvents()`, the same pure
 * table the actions validate against, so a control is never offered for a move
 * the server would refuse.
 */

function Icon({ d, className = "h-5 w-5", fill = false }: { d: string; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface TicketMessageView {
  id: string;
  kind: "CUSTOMER" | "AGENT" | "INTERNAL" | "SYSTEM";
  body: string;
  authorName: string | null;
  createdAtIso: string;
}

export interface TicketView {
  id: string;
  reference: string;
  customerName: string;
  customerId: string;
  category: string;
  status: TicketStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";
  subject: string;
  summary: string;
  /** Latest snapshot for the customer's household; null when never scored. */
  trust: number | null;
  assignedToId: string | null;
  assignedToName: string | null;
  updatedAtIso: string;
  kycRequestedAtIso: string | null;
  messages: TicketMessageView[];
}

export interface StaffOption {
  id: string;
  name: string;
  roleLabel: string;
  /** Unresolved tickets already on this desk — so a manual assignment is informed. */
  openCount: number;
}

export interface SupportStats {
  open: number;
  inProgress: number;
  unassigned: number;
  resolvedToday: number;
}

export interface SupportPermissions {
  assign: boolean;
  reply: boolean;
  resolve: boolean;
  internalNote: boolean;
}

const AVATAR = ["#005136", "#735c00", "#772f2c"];

const CAT_CHIP: Record<string, string> = {
  Compliance: "bg-[#fed65b] text-[#745c00]",
  Payments: "bg-[#006c49]/15 text-[#005136]",
  Technical: "bg-[#e7e8e9] text-[#3f4943]",
  Account: "bg-[#e7e8e9] text-[#3f4943]",
};
const PRIORITY_CHIP: Record<string, string> = {
  HIGH: "bg-[#ba1a1a] text-white",
  MEDIUM: "bg-[#fed65b] text-[#745c00]",
  LOW: "bg-[#e7e8e9] text-[#3f4943]",
};
const STATUS_DOT: Record<TicketStatus, string> = {
  IN_PROGRESS: "bg-[#735c00]",
  OPEN: "bg-[#6f7a72]",
  RESOLVED: "bg-[#005136]",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  IN_PROGRESS: "In Progress",
  OPEN: "Open",
  RESOLVED: "Resolved",
};

/** "2m ago" / "3h ago" / "5d ago" — the console's Last Update column. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function errorMessage(error: string): string {
  switch (error) {
    case "forbidden":
      return "You don't have permission for that.";
    case "illegal_transition":
      return "That isn't possible from this ticket's current state. Reopen it first.";
    case "invalid_assignee":
      return "That person can't take tickets — they must be active staff.";
    case "empty_body":
      return "Write something before sending.";
    case "read_only_session":
      return "Exit your view-as session first.";
    case "not_found":
      return "That ticket no longer exists.";
    default:
      return "Action failed. Please try again.";
  }
}

export function SupportBoard({
  tickets,
  staff,
  stats,
  permissions,
}: {
  tickets: TicketView[];
  staff: StaffOption[];
  stats: SupportStats;
  permissions: SupportPermissions;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const selected = tickets.find((t) => t.id === selectedId) ?? tickets[0] ?? null;
  const avatarFor = (t: TicketView) => AVATAR[tickets.indexOf(t) % AVATAR.length];

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(okMsg);
      router.refresh();
      return true;
    }
    toast(errorMessage(res.error), "error");
    return false;
  }

  // Which moves are legal right now — the same table the server validates against.
  const allowed = selected ? allowedTicketEvents(selected.status) : [];
  const canResolve = permissions.resolve && allowed.includes("RESOLVE");
  const canReopen = permissions.resolve && allowed.includes("REOPEN");
  const canAssign = permissions.assign && allowed.includes("ASSIGN");
  const canKyc = permissions.reply && allowed.includes("REQUEST_KYC");
  const canReply = permissions.reply && allowed.includes("REPLY");

  // What a rebalance would produce, computed with the function that applies it.
  const activeCount = tickets.filter((t) => t.status !== "RESOLVED").length;
  const shape = distributionShape(activeCount, staff.length);

  if (tickets.length === 0) {
    return (
      <div className="grid h-[calc(100vh-96px)] place-items-center rounded-xl border border-[#bec9c0] bg-white">
        <div className="max-w-md p-8 text-center">
          <h2 className="text-[18px] font-bold text-[#191c1d]">No support tickets yet</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6f7a72]">
            Tickets raised by customers appear here. The queue, assignment and resolution
            controls are live — there is simply nothing in the queue right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-96px)] gap-6">
      {/* Left: list */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-white">
        {/* Stats — every one is a real count */}
        <div className="grid grid-cols-2 gap-4 border-b border-[#bec9c0] p-6 md:grid-cols-4">
          {[
            { label: "Open", value: stats.open, icon: "M4 6h16a1 1 0 011 1v3a2 2 0 000 4v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a2 2 0 000-4V7a1 1 0 011-1z", tone: "#005136" },
            { label: "In Progress", value: stats.inProgress, icon: "M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z", tone: "#735c00" },
            { label: "Unassigned", value: stats.unassigned, icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0", tone: "#772f2c" },
            { label: "Resolved Today", value: stats.resolvedToday, icon: "M5 13l4 4L19 7", tone: "#005136" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-xl border border-[#bec9c0] bg-[#f3f4f5] p-4">
              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[#3f4943]">{s.label}</p>
                <h3 className="text-[24px] font-bold tabular-nums">{s.value}</h3>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: `${s.tone}1a`, color: s.tone }}><Icon d={s.icon} /></span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#bec9c0] px-6 py-3">
          <h2 className="text-[16px] font-bold">Support &amp; Resolutions</h2>
          {permissions.assign && staff.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#6f7a72]">
                {activeCount} active across {staff.length} staff → {shape.join(" / ")}
              </span>
              <button
                type="button"
                disabled={busy || activeCount === 0}
                onClick={() => run(rebalanceTickets, "Queue rebalanced.")}
                title="Spread every unresolved ticket evenly across the staff on shift"
                className="flex items-center gap-2 rounded-lg border border-[#bec9c0] px-3 py-1.5 text-[13px] transition-colors hover:bg-[#edeeef] disabled:opacity-40"
              >
                <Icon d="M8 7h12m0 0l-3-3m3 3l-3 3M16 17H4m0 0l3 3m-3-3l3-3" className="h-[18px] w-[18px]" />
                Rebalance
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-[#bec9c0] bg-[#f8f9fa]">
              <tr className="text-[12px] uppercase tracking-wider text-[#3f4943]">
                <th className="py-3 pl-6 font-semibold">Ticket</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-6 py-3 text-right font-semibold">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec9c0]">
              {tickets.map((t) => {
                const active = t.id === selectedId;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={clsx(
                      "cursor-pointer border-l-4 transition-colors",
                      active ? "border-l-[#005136] bg-[#006c49]/10 hover:bg-[#006c49]/20" : "border-l-transparent hover:bg-[#e7e8e9]",
                    )}
                  >
                    <td className="py-4 pl-5">
                      <span className={clsx("block font-mono text-[13px] font-bold", active ? "text-[#005136]" : "text-[#3f4943]")}>{t.reference}</span>
                      <span className={clsx("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", CAT_CHIP[t.category] ?? CAT_CHIP.Account)}>{t.category}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarFor(t) }}>{t.customerName.charAt(0)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#191c1d]">{t.customerName}</p>
                          <p className="truncate text-[10px] text-[#3f4943]">{t.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] text-[#3f4943]">
                      {t.assignedToName ?? <span className="italic text-[#6f7a72]">Unassigned</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className={clsx("flex items-center gap-1.5", t.status === "RESOLVED" ? "text-[#005136]" : "text-[#3f4943]")}>
                        <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_DOT[t.status])} />
                        <span className={clsx("text-[13px]", t.status === "RESOLVED" ? "font-bold" : "font-medium")}>{STATUS_LABEL[t.status]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={clsx("rounded px-2 py-0.5 text-[11px] font-bold uppercase", PRIORITY_CHIP[t.priority])}>{t.priority}</span></td>
                    <td className="px-6 py-4 text-right text-[13px] tabular-nums text-[#3f4943]">{ago(t.updatedAtIso)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right: detail panel */}
      {selected && (
        <aside className="hidden w-[420px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-[#f8f9fa] shadow-[-4px_0_12px_rgba(0,0,0,0.03)] xl:flex">
          <div className="border-b border-[#bec9c0] bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <span className="rounded bg-[#006c49]/10 px-2 py-1 font-mono text-xs font-bold text-[#005136]">{selected.reference}</span>
              {selected.kycRequestedAtIso && (
                <span className="rounded-full bg-[#fed65b]/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#745c00]">
                  KYC requested
                </span>
              )}
            </div>
            <h2 className="mb-1 text-[20px] font-bold">{selected.subject}</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-[#3f4943]">{selected.summary}</p>
            <div className="flex items-center gap-4 rounded-xl border border-[#bec9c0] bg-[#f8f9fa] p-3">
              <div className="flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase text-[#3f4943]">User Trust Score</p>
                {selected.trust === null ? (
                  <p className="text-[12px] italic text-[#6f7a72]">Not yet scored</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edeeef]"><div className="h-full bg-[#005136]" style={{ width: `${selected.trust}%` }} /></div>
                    <span className="text-[13px] font-bold tabular-nums text-[#005136]">{selected.trust}/100</span>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#6f7a72]">
              Assigned to {selected.assignedToName ?? "nobody yet"}
            </p>
          </div>

          {/* Thread */}
          <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
            {selected.messages.length === 0 && (
              <p className="text-center text-[12px] italic text-[#6f7a72]">No messages on this ticket yet.</p>
            )}
            {selected.messages.map((m) => {
              if (m.kind === "SYSTEM") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <p className="flex items-center gap-1 rounded-full border border-[#bec9c0] bg-[#e7e8e9] px-3 py-1 text-[11px] text-[#3f4943]">
                      <Icon d="M5 3l1 4 4 1-4 1-1 4-1-4-4-1 4-1zM17 11l.7 2.3L20 14l-2.3.7L17 17l-.7-2.3L14 14l2.3-.7z" className="h-4 w-4" />
                      {m.body}
                    </p>
                  </div>
                );
              }
              if (m.kind === "INTERNAL") {
                return (
                  <div key={m.id} className="rounded-xl border border-dashed border-[#735c00]/40 bg-[#fed65b]/10 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[#735c00]"><Icon d="M14 3v4a1 1 0 001 1h4M5 3h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" className="h-4 w-4" /></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#735c00]">Internal Note · {m.authorName ?? "staff"}</span>
                    </div>
                    <p className="text-[13px] italic text-[#745c00]">{m.body}</p>
                  </div>
                );
              }
              const agent = m.kind === "AGENT";
              return (
                <div key={m.id} className={clsx("flex gap-3", agent && "flex-row-reverse")}>
                  {agent ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#005136] text-white"><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" className="h-4 w-4" /></span>
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarFor(selected) }}>{selected.customerName.charAt(0)}</span>
                  )}
                  <div className="flex-1">
                    <div className={clsx("p-3 text-[13px]", agent ? "rounded-b-xl rounded-tl-xl bg-[#005136] text-white shadow-sm" : "rounded-b-xl rounded-tr-xl border border-[#bec9c0] bg-[#f8f9fa]")}>
                      {m.body}
                    </div>
                    <span className={clsx("mt-1 block px-1 text-[10px] text-[#6f7a72]", agent && "text-right")}>
                      {m.authorName ?? selected.customerName} • {ago(m.createdAtIso)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions + input */}
          <div className="border-t border-[#bec9c0] bg-white p-4">
            {assignOpen && canAssign && (
              <div className="mb-3 rounded-lg border border-[#bec9c0] p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#3f4943]">Assign to</p>
                <div className="space-y-1">
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (await run(() => assignTicket({ ticketId: selected.id, assigneeId: s.id }), `Assigned to ${s.name}.`)) {
                          setAssignOpen(false);
                        }
                      }}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] hover:bg-[#edeeef] disabled:opacity-40"
                    >
                      <span>{s.name} <span className="text-[11px] text-[#6f7a72]">· {s.roleLabel}</span></span>
                      <span className="text-[11px] tabular-nums text-[#6f7a72]">{s.openCount} open</span>
                    </button>
                  ))}
                  {selected.assignedToId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (await run(() => assignTicket({ ticketId: selected.id, assigneeId: null }), "Returned to the queue.")) {
                          setAssignOpen(false);
                        }
                      }}
                      className="w-full rounded px-2 py-1.5 text-left text-[13px] text-[#772f2c] hover:bg-[#ffdad6]/40 disabled:opacity-40"
                    >
                      Return to unassigned queue
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                disabled={!canAssign || busy}
                onClick={() => setAssignOpen((v) => !v)}
                title={canAssign ? "Assign this ticket to a staff member" : "Not available for this ticket"}
                className="flex-1 rounded border border-[#bec9c0] py-2 text-[11px] font-bold uppercase transition-colors hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Assign Specialist
              </button>
              <button
                type="button"
                disabled={!canKyc || busy}
                onClick={() => run(() => requestKyc({ ticketId: selected.id }), "Identity documents requested.")}
                title={canKyc ? "Ask the customer for identity documents" : "Not available for this ticket"}
                className="flex-1 rounded border border-[#bec9c0] py-2 text-[11px] font-bold uppercase transition-colors hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Request KYC
              </button>
              {canReopen ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => reopenTicket({ ticketId: selected.id }), "Ticket reopened.")}
                  className="flex-1 rounded border border-[#735c00] py-2 text-[11px] font-bold uppercase text-[#735c00] transition-transform hover:bg-[#fed65b]/20 active:scale-95"
                >
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canResolve || busy}
                  onClick={() => run(() => resolveTicket({ ticketId: selected.id }), "Ticket resolved.")}
                  className="flex-1 rounded bg-[#005136] py-2 text-[11px] font-bold uppercase text-white shadow-sm transition-transform hover:bg-[#006c49] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Resolve
                </button>
              )}
            </div>

            <div className="rounded-xl border border-[#bec9c0] bg-[#edeeef] transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#005136]">
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canReply || busy}
                placeholder={canReply ? (internal ? "Internal note — the customer will not see this…" : "Reply to customer…") : "Reopen this ticket to reply."}
                className="w-full resize-none border-none bg-transparent p-3 text-[13px] outline-none placeholder:text-[#6f7a72] disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between border-t border-[#bec9c0]/50 p-2">
                {permissions.internalNote ? (
                  <label className="flex items-center gap-1.5 pl-1 text-[11px] text-[#3f4943]">
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(e) => setInternal(e.target.checked)}
                      disabled={!canReply || busy}
                      className="accent-[#735c00]"
                    />
                    Internal note
                  </label>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  aria-label="Send"
                  disabled={!canReply || busy || draft.trim().length === 0}
                  onClick={async () => {
                    if (
                      await run(
                        () => replyToTicket({ ticketId: selected.id, body: draft, internal }),
                        internal ? "Internal note added." : "Reply sent.",
                      )
                    ) {
                      setDraft("");
                    }
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-[#005136] text-white hover:bg-[#006c49] disabled:opacity-40"
                >
                  <Icon d="M4 12l16-8-6 16-2-6-8-2z" className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

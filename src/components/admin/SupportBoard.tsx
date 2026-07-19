"use client";

import { clsx } from "clsx";
import { useState } from "react";

/**
 * Support operations console. There is no ticketing backend in SendYurt yet,
 * so the tickets, thread and metrics here are a faithful illustrative preview
 * of the design — clearly labelled as such. When a real support system lands,
 * this component swaps its mock arrays for live data with no layout change.
 */

function Icon({ d, className = "h-5 w-5", fill = false }: { d: string; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Priority = "High" | "Medium" | "Low";
type Status = "In Progress" | "Open" | "Resolved";

interface Msg {
  from: "user" | "agent";
  body: string;
  who: string;
  time: string;
}
interface Note {
  kind: "system" | "internal";
  body: string;
}
type ThreadItem = Msg | Note;

interface Ticket {
  id: string;
  name: string;
  userId: string;
  category: string;
  status: Status;
  priority: Priority;
  updated: string;
  trust: number;
  subject: string;
  summary: string;
  thread: ThreadItem[];
}

const AVATAR = ["#005136", "#735c00", "#772f2c"];

const TICKETS: Ticket[] = [
  {
    id: "#SUP-9021",
    name: "Alex Rivera",
    userId: "USR_882901",
    category: "Compliance",
    status: "In Progress",
    priority: "High",
    updated: "2m ago",
    trust: 88,
    subject: "KYC Verification Failed",
    summary: 'User is unable to withdraw funds due to "Liveness Check" failure in the mobile application.',
    thread: [
      { from: "user", who: "Alex Rivera", time: "09:12 AM", body: 'I\'ve tried the face scan four times now. Each time it says "timeout" right as I finish moving my head. My funds are locked and I need to pay rent today. Please help.' },
      { kind: "system", body: "Liveness API triggered 4xx Timeout Error" },
      { from: "agent", who: "Support Agent", time: "09:15 AM", body: "Hello Alex, I'm sorry for the frustration. I've looked at the logs and it seems there's a latency issue with our regional server. I'm escalating this to our technical team right now." },
      { kind: "internal", body: "User has $12.4k in locked assets. VIP escalation path requested due to account age (3 years)." },
      { from: "user", who: "Alex Rivera", time: "09:18 AM", body: "That's a relief. How long does the escalation usually take? I'm worried about my payment deadline." },
    ],
  },
  {
    id: "#SUP-9018",
    name: "James Wilson",
    userId: "USR_102932",
    category: "Technical",
    status: "Open",
    priority: "Medium",
    updated: "14m ago",
    trust: 72,
    subject: "App crashes on transfer confirmation",
    summary: "User reports the app closes unexpectedly when confirming a remittance to Uzbekistan.",
    thread: [
      { from: "user", who: "James Wilson", time: "08:44 AM", body: "Every time I hit confirm on a transfer, the app just closes. I'm on the latest version." },
      { kind: "system", body: "Client reported crash on /transfer/confirm" },
    ],
  },
  {
    id: "#SUP-8995",
    name: "Sarah Chen",
    userId: "USR_004562",
    category: "Billing",
    status: "Resolved",
    priority: "Low",
    updated: "1h ago",
    trust: 95,
    subject: "Duplicate fee on last transfer",
    summary: "User was charged a service fee twice on a single remittance and requested a refund.",
    thread: [
      { from: "user", who: "Sarah Chen", time: "Yesterday", body: "I think I was charged the fee twice on my last transfer." },
      { from: "agent", who: "Support Agent", time: "Yesterday", body: "You're right — I've refunded the duplicate fee. It should appear within 3 business days." },
    ],
  },
];

const CAT_CHIP: Record<string, string> = {
  Compliance: "bg-[#fed65b] text-[#745c00]",
  Technical: "bg-[#e7e8e9] text-[#3f4943]",
  Billing: "bg-[#e7e8e9] text-[#3f4943]",
};
const PRIORITY_CHIP: Record<Priority, string> = {
  High: "bg-[#ba1a1a] text-white",
  Medium: "bg-[#fed65b] text-[#745c00]",
  Low: "bg-[#e7e8e9] text-[#3f4943]",
};
const STATUS_DOT: Record<Status, string> = {
  "In Progress": "bg-[#735c00]",
  Open: "bg-[#6f7a72]",
  Resolved: "bg-[#005136]",
};

const STATS = [
  { label: "Open Tickets", value: "42", icon: "M4 6h16a1 1 0 011 1v3a2 2 0 000 4v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a2 2 0 000-4V7a1 1 0 011-1z", tone: "#005136", bg: "#006c49" },
  { label: "Avg. Response", value: "12m", icon: "M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z", tone: "#735c00", bg: "#735c00" },
  { label: "CSAT Score", value: "4.8", suffix: "/5", icon: "M9 14s1.5 2 3 2 3-2 3-2M9 9h.01M15 9h.01M12 21a9 9 0 100-18 9 9 0 000 18z", tone: "#772f2c", bg: "#772f2c" },
];

export function SupportBoard() {
  const [selectedId, setSelectedId] = useState(TICKETS[0].id);
  const selected = TICKETS.find((t) => t.id === selectedId) ?? TICKETS[0];
  const avatarFor = (t: Ticket) => AVATAR[TICKETS.indexOf(t) % AVATAR.length];

  return (
    <div className="flex h-[calc(100vh-96px)] gap-6">
      {/* Left: list */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-white">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-b border-[#bec9c0] p-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-xl border border-[#bec9c0] bg-[#f3f4f5] p-4">
              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[#3f4943]">{s.label}</p>
                <h3 className="text-[24px] font-bold tabular-nums">{s.value}{s.suffix && <span className="text-[13px] font-normal text-[#3f4943]">{s.suffix}</span>}</h3>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: `${s.bg}1a`, color: s.tone }}><Icon d={s.icon} /></span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-xl border border-[#bec9c0] bg-[#f3f4f5] p-4">
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[#3f4943]">System Health</p>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-[#005136]" />
                <h3 className="text-[16px] font-bold text-[#005136]">Online</h3>
              </div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#005136]/10 text-[#005136]"><Icon d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /></span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-b border-[#bec9c0] px-6 py-3">
          <h2 className="text-[16px] font-bold">Support &amp; Resolutions</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="flex items-center gap-2 rounded-lg border border-[#bec9c0] px-3 py-1.5 text-[13px] transition-colors hover:bg-[#edeeef]"><Icon d="M3 5h18M6 12h12M10 19h4" className="h-[18px] w-[18px]" /> Filter</button>
            <button type="button" className="flex items-center gap-2 rounded-lg border border-[#bec9c0] px-3 py-1.5 text-[13px] transition-colors hover:bg-[#edeeef]"><Icon d="M3 6h13M3 12h9M3 18h5M17 8V4m0 0l-2 2m2-2l2 2M17 16v4m0 0l-2-2m2 2l2-2" className="h-[18px] w-[18px]" /> Sort</button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-[#bec9c0] bg-[#f8f9fa]">
              <tr className="text-[12px] uppercase tracking-wider text-[#3f4943]">
                <th className="py-3 pl-6 font-semibold">Ticket ID</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-6 py-3 text-right font-semibold">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec9c0]">
              {TICKETS.map((t) => {
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
                    <td className="py-4 pl-5"><span className={clsx("font-mono text-[13px] font-bold", active ? "text-[#005136]" : "text-[#3f4943]")}>{t.id}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarFor(t) }}>{t.name.charAt(0)}</span>
                        <div>
                          <p className="text-[13px] font-bold text-[#191c1d]">{t.name}</p>
                          <p className="text-[10px] text-[#3f4943]">{t.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={clsx("rounded px-2 py-0.5 text-[11px] font-bold uppercase", CAT_CHIP[t.category])}>{t.category}</span></td>
                    <td className="px-4 py-4">
                      <div className={clsx("flex items-center gap-1.5", t.status === "Resolved" ? "text-[#005136]" : "text-[#3f4943]")}>
                        <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_DOT[t.status])} />
                        <span className={clsx("text-[13px]", t.status === "Resolved" ? "font-bold" : "font-medium")}>{t.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={clsx("rounded px-2 py-0.5 text-[11px] font-bold uppercase", PRIORITY_CHIP[t.priority])}>{t.priority}</span></td>
                    <td className="px-6 py-4 text-right text-[13px] tabular-nums text-[#3f4943]">{t.updated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-6 py-4 text-[11px] italic text-[#6f7a72]">Illustrative preview — no live ticketing backend is wired yet.</p>
        </div>
      </section>

      {/* Right: detail panel */}
      <aside className="hidden w-[420px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#bec9c0] bg-[#f8f9fa] shadow-[-4px_0_12px_rgba(0,0,0,0.03)] xl:flex">
        <div className="border-b border-[#bec9c0] bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded bg-[#006c49]/10 px-2 py-1 font-mono text-xs font-bold text-[#005136]">{selected.id}</span>
            <div className="flex gap-2">
              <button type="button" aria-label="Flag" className="rounded-lg p-1.5 hover:bg-[#edeeef]"><Icon d="M5 21V4h11l-1 4 1 4H5" className="h-[18px] w-[18px]" /></button>
              <button type="button" aria-label="More" className="rounded-lg p-1.5 hover:bg-[#edeeef]"><Icon d="M12 6h.01M12 12h.01M12 18h.01" className="h-[18px] w-[18px]" /></button>
            </div>
          </div>
          <h2 className="mb-1 text-[20px] font-bold">{selected.subject}</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-[#3f4943]">{selected.summary}</p>
          <div className="flex items-center gap-4 rounded-xl border border-[#bec9c0] bg-[#f8f9fa] p-3">
            <div className="flex-1">
              <p className="mb-1 text-[10px] font-bold uppercase text-[#3f4943]">User Trust Score</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edeeef]"><div className="h-full bg-[#005136]" style={{ width: `${selected.trust}%` }} /></div>
                <span className="text-[13px] font-bold tabular-nums text-[#005136]">{selected.trust}/100</span>
              </div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#005136]/20 bg-[#005136]/10 text-[#005136]"><Icon d="M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /></span>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
          {selected.thread.map((item, i) => {
            if ("kind" in item && item.kind === "system") {
              return (
                <div key={i} className="flex justify-center">
                  <p className="flex items-center gap-1 rounded-full border border-[#bec9c0] bg-[#e7e8e9] px-3 py-1 text-[11px] text-[#3f4943]">
                    <Icon d="M5 3l1 4 4 1-4 1-1 4-1-4-4-1 4-1zM17 11l.7 2.3L20 14l-2.3.7L17 17l-.7-2.3L14 14l2.3-.7z" className="h-4 w-4" />
                    {item.body}
                  </p>
                </div>
              );
            }
            if ("kind" in item && item.kind === "internal") {
              return (
                <div key={i} className="rounded-xl border border-dashed border-[#735c00]/40 bg-[#fed65b]/10 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[#735c00]"><Icon d="M14 3v4a1 1 0 001 1h4M5 3h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" className="h-4 w-4" /></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#735c00]">Internal Note</span>
                  </div>
                  <p className="text-[13px] italic text-[#745c00]">{item.body}</p>
                </div>
              );
            }
            const msg = item as Msg;
            const agent = msg.from === "agent";
            return (
              <div key={i} className={clsx("flex gap-3", agent && "flex-row-reverse")}>
                {agent ? (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#005136] text-white"><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" className="h-4 w-4" /></span>
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarFor(selected) }}>{selected.name.charAt(0)}</span>
                )}
                <div className="flex-1">
                  <div className={clsx("p-3 text-[13px]", agent ? "rounded-b-xl rounded-tl-xl bg-[#005136] text-white shadow-sm" : "rounded-b-xl rounded-tr-xl border border-[#bec9c0] bg-[#f8f9fa]")}>
                    {msg.body}
                  </div>
                  <span className={clsx("mt-1 block px-1 text-[10px] text-[#6f7a72]", agent && "text-right")}>{msg.who} • {msg.time}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions + input */}
        <div className="border-t border-[#bec9c0] bg-white p-4">
          <div className="mb-4 flex gap-2">
            <button type="button" className="flex-1 rounded border border-[#bec9c0] py-2 text-[11px] font-bold uppercase transition-colors hover:bg-[#edeeef]">Assign Specialist</button>
            <button type="button" className="flex-1 rounded border border-[#bec9c0] py-2 text-[11px] font-bold uppercase transition-colors hover:bg-[#edeeef]">Request KYC</button>
            <button type="button" className="flex-1 rounded bg-[#005136] py-2 text-[11px] font-bold uppercase text-white shadow-sm transition-transform hover:bg-[#006c49] active:scale-95">Resolve</button>
          </div>
          <div className="rounded-xl border border-[#bec9c0] bg-[#edeeef] transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#005136]">
            <textarea rows={3} placeholder="Reply to customer..." className="w-full resize-none border-none bg-transparent p-3 text-[13px] outline-none placeholder:text-[#6f7a72]" />
            <div className="flex items-center justify-between border-t border-[#bec9c0]/50 p-2">
              <div className="flex items-center gap-1 text-[#3f4943]">
                <button type="button" aria-label="Attach" className="rounded-lg p-1.5 hover:bg-[#e7e8e9]"><Icon d="M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8" className="h-[18px] w-[18px]" /></button>
                <button type="button" aria-label="Image" className="rounded-lg p-1.5 hover:bg-[#e7e8e9]"><Icon d="M4 5h16v14H4zM8 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 17l5-5 4 4 3-3 4 4" className="h-[18px] w-[18px]" /></button>
                <button type="button" aria-label="Emoji" className="rounded-lg p-1.5 hover:bg-[#e7e8e9]"><Icon d="M9 14s1.5 2 3 2 3-2 3-2M9 9h.01M15 9h.01M12 21a9 9 0 100-18 9 9 0 000 18z" className="h-[18px] w-[18px]" /></button>
              </div>
              <button type="button" aria-label="Send" className="grid h-8 w-8 place-items-center rounded-lg bg-[#005136] text-white hover:bg-[#006c49]"><Icon d="M4 12l16-8-6 16-2-6-8-2z" className="h-[18px] w-[18px]" /></button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

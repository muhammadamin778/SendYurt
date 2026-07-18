"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function Icon({ d, className = "h-5 w-5", fill = false }: { d: string; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const I = {
  search: "M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  help: "M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 21a9 9 0 100-18 9 9 0 000 18z",
  phone: "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 4h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 11.5a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z",
  video: "M23 7l-7 5 7 5V7zM1 5h13a2 2 0 012 2v10a2 2 0 01-2 2H1z",
  more: "M12 13a1 1 0 100-2 1 1 0 000 2zM12 6a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z",
  info: "M12 16v-4M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z",
  plus: "M12 8v8M8 12h8M12 21a9 9 0 100-18 9 9 0 000 18z",
  image: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  mood: "M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M12 21a9 9 0 100-18 9 9 0 000 18z",
  attach: "M21 8l-9.2 9.2a4 4 0 01-5.7-5.7L14 3.6a2.5 2.5 0 013.6 3.6L9 15.5",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8M8 12h5",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  headset: "M4 13a8 8 0 0116 0M4 13v3a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zm16 0v3a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z",
  check2: "M18 6L7 17l-5-5",
};

interface Msg { from: "agent" | "me"; text: string; time: string; system?: boolean }
type Filter = "all" | "active" | "solved";

interface Conversation {
  id: string;
  title: string;
  preview: string;
  when: string;
  state: "live" | "solved";
  messages: Msg[];
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SupportCenter({
  user,
  trustScore,
  trustLabel,
  recipient,
  agentName = "Dilbar",
}: {
  user: { name: string; initial: string };
  trustScore: number;
  trustLabel: string;
  recipient: string;
  agentName?: string;
}) {
  const t = useTranslations("support");

  const initialConversations: Conversation[] = [
    {
      id: "transfer-delay",
      title: "Transfer Delay",
      preview: "I will check the status of your Moscow to Tashkent transfer immediately…",
      when: "2m ago",
      state: "live",
      messages: [
        { from: "agent", text: `${t("agent", { name: agentName })} ${t("joined", { name: agentName }).replace(agentName + " ", "")}`, time: "", system: true },
        { from: "agent", text: `Assalomu alaykum! I'm ${agentName} from the SendYurt support team. I see you're inquiring about a transfer from Moscow to Tashkent. How can I assist you today?`, time: "10:42 AM" },
        { from: "me", text: 'Va alaykum assalom. My transfer #EY-99210 is still showing as "Pending" after 4 hours. Usually it takes 15 minutes. Is there a problem?', time: "10:44 AM" },
        { from: "agent", text: "I understand your concern. Let me check that for you. Since this is a Moscow-Tashkent route, we sometimes have additional compliance checks for amounts over 50,000 RUB.", time: "" },
        { from: "agent", text: "I can see the transfer now. It's just undergoing a standard security validation. It should be cleared in the next 30 minutes. Would you like me to notify you once it's completed?", time: "10:45 AM" },
      ],
    },
    { id: "trust-q", title: "Trust Score Question", preview: "Thank you for helping me verify my passport.", when: "Yesterday", state: "solved", messages: [{ from: "agent", text: "Your passport verification is complete — your Trust Score limits have been raised. Anything else I can help with?", time: "" }] },
    { id: "beneficiary", title: "Beneficiary Limits", preview: "Can I add my brother as a second beneficiary?", when: "3 days ago", state: "solved", messages: [{ from: "agent", text: "Yes — you can add up to 5 beneficiaries. I've enabled a second slot on your household. 👍", time: "" }] },
  ];

  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState("transfer-delay");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId)!;
  const shown = conversations.filter((c) => (filter === "all" ? true : filter === "active" ? c.state === "live" : c.state === "solved"));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active.messages.length, activeId]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { from: "me", text, time: nowTime() }] } : c)));
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* In-page header */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-[20px] font-bold text-[#0f172a]">{t("title")}</h1>
        <span className="hidden h-6 w-px bg-[#e2e8f0] md:block" />
        <span className="hidden items-center gap-1.5 text-sm text-[#64748b] md:flex">
          <Icon d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" className="h-[18px] w-[18px] text-[#0a7c53]" />
          {t("verification", { percent: Math.round(trustScore) })}
        </span>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 py-1.5 sm:flex">
          <Icon d={I.search} className="h-[18px] w-[18px] text-[#94a3b8]" />
          <input className="w-40 border-none bg-transparent text-sm outline-none placeholder:text-[#94a3b8]" placeholder={t("searchKb")} />
        </div>
      </div>

      {/* Three-pane shell */}
      <div className="flex h-[76vh] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {/* Conversations */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-[#e2e8f0] bg-[#f8fafc] lg:flex">
          <div className="border-b border-[#e2e8f0] p-4">
            <h2 className="mb-4 text-[18px] font-semibold text-[#0f172a]">{t("conversations")}</h2>
            <div className="flex gap-2">
              {(["all", "active", "solved"] as Filter[]).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={clsx("flex-1 rounded-lg py-2 text-xs font-bold transition-colors", filter === f ? "bg-[#131b2e] text-white" : "bg-[#e6e8ea] text-[#64748b] hover:bg-[#dfe3e8]")}>
                  {t(f)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {shown.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button key={c.id} type="button" onClick={() => setActiveId(c.id)} className={clsx("w-full border-b border-[#eef2f7] p-4 text-left transition-colors", isActive ? "border-l-4 border-l-[#0a7c53] bg-white" : "hover:bg-white")}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-[#0f172a]">{c.title}</span>
                    <span className="shrink-0 text-[10px] text-[#94a3b8]">{c.when}</span>
                  </div>
                  <p className="truncate text-xs text-[#64748b]">{c.preview}</p>
                  <div className="mt-2">
                    {c.state === "live" ? (
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-[#0a7c53]"><span className="h-2 w-2 rounded-full bg-[#0a7c53]" />{t("liveWith", { name: agentName })}</span>
                    ) : (
                      <span className="rounded-md bg-[#e6e8ea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[#64748b]">{t("solved")}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex flex-1 flex-col bg-white">
          <div className="flex h-14 items-center justify-between border-b border-[#e2e8f0] px-6">
            <div className="flex items-center gap-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#0a7c53] to-[#065f3e] text-sm font-bold text-white">
                {agentName.charAt(0)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#4edea3]" />
              </span>
              <div>
                <p className="text-sm font-bold leading-tight text-[#0f172a]">{agentName}</p>
                <p className="text-[10px] font-medium text-[#0a7c53]">{t("activeNow")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#94a3b8]">
              <button type="button" className="transition-colors hover:text-[#0a7c53]"><Icon d={I.phone} className="h-5 w-5" /></button>
              <button type="button" className="transition-colors hover:text-[#0a7c53]"><Icon d={I.video} className="h-5 w-5" /></button>
              <button type="button" className="transition-colors hover:text-[#0a7c53]"><Icon d={I.more} className="h-5 w-5" /></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
            {active.messages.map((m, i) =>
              m.system ? (
                <div key={i} className="flex justify-center">
                  <span className="flex items-center gap-2 rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-medium text-[#64748b]">
                    <Icon d={I.info} className="h-3.5 w-3.5" />
                    {t("joined", { name: agentName })}
                  </span>
                </div>
              ) : m.from === "agent" ? (
                <div key={i} className="flex max-w-[80%] items-start gap-3">
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a7c53] to-[#065f3e] text-xs font-bold text-white">{agentName.charAt(0)}</span>
                  <div>
                    <div className="rounded-2xl rounded-bl-sm bg-[#f1f5f9] p-4 text-[#0f172a] shadow-sm"><p className="text-sm leading-relaxed">{m.text}</p></div>
                    {m.time && <span className="mt-1 block text-[10px] text-[#94a3b8]">{m.time}</span>}
                  </div>
                </div>
              ) : (
                <div key={i} className="ml-auto flex max-w-[80%] flex-row-reverse items-start gap-3">
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#131b2e] text-[10px] font-bold text-white">{user.initial}</span>
                  <div className="flex flex-col items-end">
                    <div className="rounded-2xl rounded-br-sm bg-[#0a7c53] p-4 text-white shadow-sm"><p className="text-sm leading-relaxed">{m.text}</p></div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-[#94a3b8]">{m.time}</span>
                      <Icon d="M18 7l-8 8-4-4M22 7l-8 8" className="h-3.5 w-3.5 text-[#0a7c53]" />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Composer */}
          <div className="p-6">
            <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-sm">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="h-12 w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
                placeholder={t("typeMessage")}
              />
              <div className="mt-2 flex items-center justify-between border-t border-[#eef2f7] pt-3">
                <div className="flex items-center gap-1 text-[#94a3b8]">
                  {[I.plus, I.image, I.mood, I.attach].map((d, i) => (
                    <button key={i} type="button" className="rounded-lg p-2 transition-colors hover:bg-[#e6e8ea]"><Icon d={d} className="h-5 w-5" /></button>
                  ))}
                </div>
                <button type="button" onClick={send} className="flex items-center gap-2 rounded-xl bg-[#0a7c53] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-95">
                  {t("send")}
                  <Icon d={I.send} className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Context */}
        <aside className="hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-[#e2e8f0] bg-[#f8fafc] p-6 xl:flex">
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">{t("currentIssue")}</h3>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0a7c53]/10 text-[#0a7c53]"><Icon d={I.receipt} className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-bold text-[#0f172a]">#EY-99210</p>
                  <p className="text-[10px] text-[#94a3b8]">Moscow → Tashkent</p>
                </div>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-[#94a3b8]">{t("amount")}</span><span className="font-bold text-[#0f172a]">65,000 RUB</span></div>
                <div className="flex justify-between"><span className="text-[#94a3b8]">{t("fee")}</span><span className="font-bold text-[#0a7c53]">0 RUB ({t("promo")})</span></div>
                <div className="flex justify-between"><span className="text-[#94a3b8]">{t("recipient")}</span><span className="font-bold text-[#0f172a]">{recipient}</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#eef2f7] pt-4">
                <span className="text-[11px] font-bold text-[#0f172a]">{t("status")}</span>
                <span className="rounded bg-[#ffddb8] px-2 py-0.5 text-[10px] font-bold text-[#b87500]">{t("statusValidation")}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">{t("trustScore")}</h3>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0f172a]">{trustLabel}</span>
                <span className="text-xs font-bold text-[#0a7c53]">{trustScore}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                <div className="h-full rounded-full bg-[#0a7c53]" style={{ width: `${Math.min(100, trustScore)}%` }} />
              </div>
              <p className="mt-2 text-[10px] italic text-[#94a3b8]">{t("trustNote")}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">{t("relatedFaqs")}</h3>
            <ul className="space-y-3">
              {["Average transfer times to Uzbekistan", "Moscow compliance regulations", "How to increase daily limits"].map((f) => (
                <li key={f}>
                  <a href="#" className="flex items-center gap-2 text-xs text-[#0a7c53] hover:underline"><Icon d={I.external} className="h-4 w-4" />{f}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto border-t border-[#e2e8f0] pt-6">
            <button type="button" className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#0a7c53] py-4 font-bold text-[#0a7c53] transition-all hover:bg-[#0a7c53]/5">
              <Icon d={I.headset} className="h-5 w-5 transition-transform group-hover:scale-110" />
              {t("startCall")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

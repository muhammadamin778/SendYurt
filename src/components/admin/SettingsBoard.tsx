"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";

/** Audit entry as prepared by the server page (real AuditLog rows). */
export interface AuditItem {
  id: string;
  tag: string;
  tone: "primary" | "error" | "secondary";
  title: string;
  time: string;
  detail: string;
  meta: string[];
}

export interface ProviderHealth {
  name: string;
  initial: string;
  /** stable = green, lagging = amber, offline = red */
  state: "stable" | "lagging" | "offline";
  latencyMs: number;
}

interface SettingsBoardProps {
  usdRate: string;
  eurRate: string;
  ratesLive: boolean;
  providers: ProviderHealth[];
  audit: AuditItem[];
  volume24h: string;
  reserveBalance: string;
}

function Icon({ d, className = "h-5 w-5", fill = false }: { d: string; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CARD = "rounded-xl border border-[#bec9c0] bg-white p-6";

const STATE_TONE: Record<ProviderHealth["state"], { color: string; label: string; border: string; bg: string }> = {
  stable: { color: "#006c49", label: "Stable", border: "hover:border-[#006c49]", bg: "" },
  lagging: { color: "#735c00", label: "Lagging", border: "hover:border-[#735c00]", bg: "" },
  offline: { color: "#ba1a1a", label: "Offline", border: "hover:border-[#ba1a1a]", bg: "bg-[#ffdad6]/20" },
};

const TAG_TONE: Record<AuditItem["tone"], string> = {
  primary: "bg-[#006c49]/10 text-[#006c49]",
  error: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  secondary: "bg-[#735c00]/10 text-[#735c00]",
};

export function SettingsBoard({ usdRate, eurRate, ratesLive, providers, audit, volume24h, reserveBalance }: SettingsBoardProps) {
  const [simulation, setSimulation] = useState(false);
  const [rateMode, setRateMode] = useState<"manual" | "auto">("manual");
  const [fee, setFee] = useState(1.25);
  const [vol, setVol] = useState(0.5);
  const [toggles, setToggles] = useState({ freeze: true, velocity: true, review: false });
  const [expanded, setExpanded] = useState<string | null>(null);

  // Illustrative projected outcome — mirrors the reference model.
  const outcome = fee * 10 + vol * 5;
  const progress = Math.min(100, Math.max(10, outcome * 1.5));
  const outcomeColor = progress > 70 ? "#005136" : progress > 40 ? "#735c00" : "#ba1a1a";

  // Live-ish latency drift for the provider health bars (offline stays flat).
  const [bars, setBars] = useState<number[][]>(() => providers.map((p) => (p.state === "offline" ? Array(6).fill(10) : [40, 60, 45, 70, 30, 55])));
  useEffect(() => {
    const t = setInterval(() => {
      setBars((prev) =>
        prev.map((row, i) => (providers[i]?.state === "offline" ? row : row.map(() => Math.floor(Math.random() * 70) + 20))),
      );
    }, 2000);
    return () => clearInterval(t);
  }, [providers]);

  const offlineProvider = useMemo(() => providers.find((p) => p.state === "offline"), [providers]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {simulation && (
            <span className="mb-2 inline-block rounded-md bg-[#735c00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Drafting Mode: Changes won&apos;t affect live production
            </span>
          )}
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">System Settings &amp; Liquidity</h2>
          <p className="text-[14px] text-[#3f4943]">Configure core exchange logic, provider gateways, and global compliance thresholds.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Simulation Mode toggle (design places this in the top bar; kept in the
              page header so it doesn't leak onto other admin routes). */}
          <div className="flex items-center gap-2 rounded-full bg-[#fed65b]/20 px-3 py-1.5">
            <span className="text-[12px] font-semibold text-[#735c00]">Simulation Mode</span>
            <button
              type="button"
              onClick={() => setSimulation((s) => !s)}
              aria-pressed={simulation}
              aria-label="Toggle simulation mode"
              className={clsx("relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors", simulation ? "bg-[#735c00]" : "bg-[#bec9c0]")}
            >
              <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", simulation ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>
          <button type="button" className="rounded-lg bg-[#e1e3e4] px-4 py-2 text-[13px] font-bold text-[#191c1d] transition-colors hover:bg-[#bec9c0]/50">Export Config</button>
          <button type="button" className="rounded-lg bg-[#005136] px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-opacity hover:opacity-95">Save All Changes</button>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Global Exchange Rates */}
        <div className={clsx("col-span-12 lg:col-span-8", CARD, "transition-all duration-500", simulation && "border-[#e9c349] bg-[#fff9e6]")}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#005136]"><Icon d="M4 8h13l-3-3M20 16H7l3 3" /></span>
              <h3 className="text-[16px] font-semibold">Global Exchange Rates</h3>
            </div>
            <div className="flex rounded-lg bg-[#edeeef] p-1">
              <button type="button" onClick={() => setRateMode("manual")} className={clsx("rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors", rateMode === "manual" ? "bg-white text-[#005136] shadow-sm" : "text-[#3f4943] hover:text-[#191c1d]")}>Manual Override</button>
              <button type="button" onClick={() => setRateMode("auto")} className={clsx("rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors", rateMode === "auto" ? "bg-white text-[#005136] shadow-sm" : "text-[#3f4943] hover:text-[#191c1d]")}>Auto-Feed</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* USD */}
            <div className="flex flex-col gap-3 rounded-lg border border-[#bec9c0] p-4 transition-all hover:border-[#005136]">
              <div className="flex items-start justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-tight text-[#3f4943]">USD → UZS</span>
                <span className="rounded-full bg-[#005136]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#005136]">Primary</span>
              </div>
              <div className="flex items-baseline gap-2">
                <input type="text" defaultValue={usdRate} readOnly={rateMode === "auto"} className="w-full border-none bg-transparent p-0 text-[20px] font-bold tabular-nums text-[#191c1d] outline-none" />
                <span className="text-[13px] text-[#3f4943]">UZS</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] text-[#3f4943]"><span className="text-[#ba1a1a]"><Icon d="M4 7l6 6 4-4 6 6M20 15v-4" className="h-3 w-3" /></span>-0.4% vs Market</span>
                <button type="button" className="text-[11px] font-bold text-[#005136] underline">Apply Feed</button>
              </div>
            </div>
            {/* EUR */}
            <div className="flex flex-col gap-3 rounded-lg border border-[#bec9c0] p-4 transition-all hover:border-[#005136]">
              <div className="flex items-start justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-tight text-[#3f4943]">EUR → UZS</span>
              </div>
              <div className="flex items-baseline gap-2">
                <input type="text" defaultValue={eurRate} readOnly={rateMode === "auto"} className="w-full border-none bg-transparent p-0 text-[20px] font-bold tabular-nums text-[#191c1d] outline-none" />
                <span className="text-[13px] text-[#3f4943]">UZS</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] text-[#3f4943]"><span className="text-[#005136]"><Icon d="M4 17l6-6 4 4 6-6M20 9v4" className="h-3 w-3" /></span>+0.12% vs Market</span>
                <button type="button" className="text-[11px] font-bold text-[#005136] underline">Apply Feed</button>
              </div>
            </div>
            {/* Spread config */}
            <div className="space-y-6 rounded-lg bg-[#f3f4f5] p-5 md:col-span-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#3f4943]">Interactive Risk Spread Configuration</h4>
                <span className="rounded bg-[#005136]/10 px-2 py-0.5 text-[10px] font-bold text-[#005136]">PROJECTION ENABLED</span>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-bold">Fee Margin (%)</label>
                      <span className="font-bold tabular-nums text-[#005136]">{fee.toFixed(2)}%</span>
                    </div>
                    <input type="range" min={0} max={5} step={0.05} value={fee} onChange={(e) => setFee(parseFloat(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#bec9c0] accent-[#005136]" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-bold">Volatility Buffer (%)</label>
                      <span className="font-bold tabular-nums text-[#735c00]">{vol.toFixed(2)}%</span>
                    </div>
                    <input type="range" min={0} max={2} step={0.05} value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#bec9c0] accent-[#735c00]" />
                  </div>
                </div>
                <div className="flex flex-col justify-center rounded-lg border border-[#bec9c0]/30 bg-[#e1e3e4]/50 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase text-[#3f4943]">Projected Net Margin Outcome</p>
                  <div className="flex items-center gap-4">
                    <div className="text-[24px] font-bold tabular-nums" style={{ color: outcomeColor }}>+ ${outcome.toFixed(2)}</div>
                    <div className="text-[10px] leading-tight text-[#3f4943]">per $1,000 tx volume<br />at current rates</div>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#bec9c0]/20">
                    <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: outcomeColor }} />
                  </div>
                  <p className="mt-3 text-[10px] italic text-[#6f7a72]">Illustrative projection</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Health */}
        <div className={clsx("col-span-12 lg:col-span-4", CARD)}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#735c00]"><Icon d="M8 3v4M16 3v4M4 9h16M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zM9 13l2 2 4-4" /></span>
              <h3 className="text-[16px] font-semibold">Provider Health</h3>
            </div>
            <span className="animate-pulse text-[10px] font-semibold uppercase text-[#6f7a72]">Live</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {providers.map((p, i) => {
              const tone = STATE_TONE[p.state];
              return (
                <div key={p.name} className={clsx("group rounded-xl border border-[#bec9c0] p-4 transition-all", tone.border, tone.bg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg font-bold" style={{ backgroundColor: `${tone.color}1a`, color: tone.color }}>{p.initial}</div>
                      <div>
                        <p className="text-[14px] font-bold">{p.name}</p>
                        <p className="flex items-center gap-1 text-[11px]" style={{ color: tone.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                          {p.state === "offline" ? "Offline (Timed Out)" : `${tone.label} (${p.latencyMs}ms)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex h-10 items-end gap-[2px]" style={{ color: tone.color, opacity: p.state === "offline" ? 0.4 : 0.6 }}>
                      {bars[i]?.map((h, bi) => (
                        <span key={bi} className="w-1 rounded-[1px] bg-current transition-all duration-500" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-[#772f2c]/20 bg-[#954642]/10 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#772f2c]"><Icon d="M12 9v4m0 3v.5M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" /></span>
              <div>
                <p className="text-[13px] font-bold text-[#772f2c]">Incident Detected</p>
                <p className="text-[11px] text-[#3f4943]">
                  {offlineProvider ? `${offlineProvider.name} gateway failed heartbeats. Automated failover initiated at 09:42:15 UTC.` : "All gateways nominal. No active incidents."}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] italic text-[#6f7a72]">Provider names are live; latency &amp; status are illustrative.</p>
        </div>

        {/* Compliance Control Center */}
        <div className={clsx("col-span-12 lg:col-span-7", CARD)}>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[#005136]"><Icon d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /></span>
            <h3 className="text-[16px] font-semibold">Compliance Control Center</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { cap: "Daily Cap", tier: "Personal Tier 1", value: "5,000.00", note: "AUTO-RESETS: 00:00 UTC", action: "HISTORY", icon: "M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" },
              { cap: "Monthly Cap", tier: "Verified Tier 2", value: "50,000.00", note: "AGGREGATION ENABLED", action: "LIMITS MAP", icon: "M7 3v4M17 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" },
            ].map((c) => (
              <div key={c.tier} className="rounded-xl border border-[#bec9c0] bg-[#f3f4f5] p-4 transition-all hover:border-[#005136]">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#3f4943]">{c.cap}</p>
                    <h4 className="text-[14px] font-bold">{c.tier}</h4>
                  </div>
                  <span className="text-[#006c49]"><Icon d={c.icon} /></span>
                </div>
                <div className="relative mb-4">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#3f4943]">$</span>
                  <input type="text" defaultValue={c.value} className="w-full rounded-lg border border-[#bec9c0] bg-white py-2.5 pl-7 pr-3 text-[16px] font-bold tabular-nums outline-none focus:border-[#005136] focus:ring-1 focus:ring-[#005136]" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#3f4943]">
                  <span>{c.note}</span>
                  <button type="button" className="text-[#005136] hover:underline">{c.action}</button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:col-span-2">
              {[
                { key: "freeze" as const, label: "Auto-Freeze", icon: "M12 3v18M5 7l14 10M19 7L5 17M4 12h16" },
                { key: "velocity" as const, label: "Velocity Alerts", icon: "M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0" },
                { key: "review" as const, label: "Manual Review", icon: "M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" },
              ].map((t) => {
                const on = toggles[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setToggles((p) => ({ ...p, [t.key]: !p[t.key] }))}
                    aria-pressed={on}
                    className={clsx(
                      "flex h-full flex-col items-center justify-center rounded-xl border p-3 text-center transition-all",
                      on ? "border-[#005136] bg-[#005136]/10" : "border-[#bec9c0] bg-[#f3f4f5]",
                    )}
                  >
                    <span className={clsx("mb-1", on ? "text-[#005136]" : "text-[#3f4943]")}><Icon d={t.icon} /></span>
                    <span className="text-[11px] font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Audit Log — REAL data */}
        <div className={clsx("col-span-12 lg:col-span-5 flex flex-col", CARD)}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#3f4943]"><Icon d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-3M8 3v4h4M15 4l5 5-8 8H7v-5z" /></span>
              <h3 className="text-[16px] font-semibold">System Audit Log</h3>
            </div>
            <button type="button" className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#005136] hover:underline">Full Report</button>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-2">
            {audit.length === 0 && <p className="py-8 text-center text-[13px] text-[#6f7a72]">No audit activity recorded yet.</p>}
            {audit.map((a) => {
              const open = expanded === a.id;
              return (
                <div key={a.id} className="overflow-hidden rounded-lg border border-[#bec9c0] bg-[#f8f9fa] transition-all hover:bg-[#edeeef]">
                  <button type="button" onClick={() => setExpanded(open ? null : a.id)} className="flex w-full items-center justify-between p-3 text-left">
                    <span className="flex items-center gap-3">
                      <span className={clsx("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", TAG_TONE[a.tone])}>{a.tag}</span>
                      <span className="text-[13px] font-bold">{a.title}</span>
                    </span>
                    <span className="text-[10px] text-[#6f7a72]">{a.time}</span>
                  </button>
                  {open && (
                    <div className="border-t border-[#bec9c0]/30 bg-[#f3f4f5] px-3 pb-3 pt-2">
                      <p className="mb-2 text-[11px] text-[#3f4943]">{a.detail}</p>
                      {a.meta.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {a.meta.map((m) => (
                            <span key={m} className="rounded border border-[#bec9c0] bg-white px-1.5 py-0.5 text-[9px] text-[#3f4943]">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liquidity banner */}
        <div className={clsx("col-span-12 relative h-[300px] overflow-hidden rounded-xl bg-[#005136] transition-all duration-500", simulation && "saturate-150 sepia-[0.3]")}>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#005136] to-[#006c49] opacity-20" />
          <div className="relative z-10 flex h-full p-8">
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <h3 className="text-[24px] font-semibold text-white">Total Liquidity Pool</h3>
                <p className="text-[16px] text-[#81d8ad]">Real-time consolidated reserve status across all providers.</p>
              </div>
              <div className="flex gap-12">
                <div>
                  <p className="mb-1 text-[12px] font-bold uppercase text-[#81d8ad]">Reserve Balance</p>
                  <p className="text-[32px] font-extrabold tabular-nums text-white">{reserveBalance}</p>
                  <p className="mt-1 text-[10px] italic text-white/40">Illustrative</p>
                </div>
                <div>
                  <p className="mb-1 text-[12px] font-bold uppercase text-[#81d8ad]">24h Volume</p>
                  <p className="text-[32px] font-extrabold tabular-nums text-white">{volume24h}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#81d8ad]/70">{ratesLive ? "Live ledger" : "From ledger"}</p>
                </div>
              </div>
            </div>
            <div className="flex w-1/3 items-center justify-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 192 192">
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="white" strokeWidth="12" strokeDasharray="552.92" strokeDashoffset="138.23" className="transition-all duration-1000" />
                </svg>
                <div className="absolute text-center">
                  <p className="text-[20px] font-bold text-white">75%</p>
                  <p className="text-[10px] font-bold uppercase text-[#81d8ad]">Capacity</p>
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 p-8 opacity-30">
            <Icon d="M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z" className="h-40 w-40 text-white" fill />
          </div>
        </div>
      </div>
    </div>
  );
}

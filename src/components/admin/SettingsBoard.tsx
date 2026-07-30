"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IllustrativeTag } from "@/components/admin/IllustrativeTag";

/**
 * System settings — read-only.
 *
 * This page used to present a full control surface (Save All Changes, rate
 * overrides, fee sliders, transaction caps, compliance toggles) where nothing
 * persisted: there is no settings table in the schema, and FX rates live only
 * in an in-process cache (src/lib/fx.ts), so those controls had nowhere to
 * write. Rather than keep buttons that silently do nothing, the page now shows
 * only what is genuinely true. The controls come back when there is somewhere
 * to store their values.
 *
 * Real here: live FX rates, the provider list, the audit log, 24h ledger
 * volume. Anything still placeholder carries an <IllustrativeTag />.
 */

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
  /** Link to the full audit viewer — this panel only shows the latest few. */
  auditHref: string;
}

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CARD = "rounded-xl border border-[#bec9c0] bg-white p-6";

const STATE_TONE: Record<ProviderHealth["state"], { color: string; label: string }> = {
  stable: { color: "#006c49", label: "Stable" },
  lagging: { color: "#735c00", label: "Lagging" },
  offline: { color: "#ba1a1a", label: "Offline" },
};

const TAG_TONE: Record<AuditItem["tone"], string> = {
  primary: "bg-[#006c49]/10 text-[#006c49]",
  error: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  secondary: "bg-[#735c00]/10 text-[#735c00]",
};

export function SettingsBoard({
  usdRate,
  eurRate,
  ratesLive,
  providers,
  audit,
  volume24h,
  reserveBalance,
  auditHref,
}: SettingsBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#bec9c0] bg-white p-6 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#191c1d]">System Settings</h2>
          <p className="text-[14px] text-[#3f4943]">Live rates, provider routing and the audit trail.</p>
        </div>
        <p className="max-w-sm text-[12px] leading-relaxed text-[#6f7a72]">
          Editing rates and limits from here isn&apos;t available yet — there is no
          settings store behind it. Provider fees live in the database; the FX
          feed is fetched live.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Exchange rates — REAL */}
        <div className={clsx("col-span-12 lg:col-span-7", CARD)}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#005136]"><Icon d="M4 8h13l-3-3M20 16H7l3 3" /></span>
              <h3 className="text-[16px] font-semibold">Global Exchange Rates</h3>
            </div>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                ratesLive ? "bg-[#006c49]/10 text-[#006c49]" : "bg-[#735c00]/10 text-[#735c00]",
              )}
            >
              {ratesLive ? "Live feed" : "Sample rates"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { pair: "USD → UZS", value: usdRate },
              { pair: "EUR → UZS", value: eurRate },
            ].map((r) => (
              <div key={r.pair} className="rounded-lg border border-[#bec9c0] bg-[#f8f9fa] p-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#6f7a72]">{r.pair}</p>
                <p className="mt-1 text-[24px] font-bold tabular-nums text-[#191c1d]">{r.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-[#6f7a72]">
            {ratesLive
              ? "Mid-market rates from the live feed, cached for an hour."
              : "The live feed was unreachable, so the built-in sample table is shown."}
          </p>
        </div>

        {/* Provider routing — names real, health illustrative */}
        <div className={clsx("col-span-12 lg:col-span-5", CARD)}>
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[#3f4943]"><Icon d="M4 6h16M4 12h16M4 18h7" /></span>
              <h3 className="text-[16px] font-semibold">Provider Routing</h3>
            </div>
            <IllustrativeTag />
          </div>
          <div className="space-y-3">
            {providers.length === 0 && <p className="text-[13px] text-[#6f7a72]">No providers configured.</p>}
            {providers.map((p) => {
              const tone = STATE_TONE[p.state];
              return (
                <div key={p.name} className="flex items-center gap-3 rounded-lg border border-[#bec9c0] bg-[#f8f9fa] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#006c49]/10 text-[12px] font-bold text-[#006c49]">
                    {p.initial}
                  </span>
                  <span className="flex-1 text-[14px] font-semibold text-[#191c1d]">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: tone.color }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.color }} />
                    {tone.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] text-[#6f7a72]">
            Names and fees come from the database. Health and latency are
            placeholders — no monitoring feed is wired.
          </p>
        </div>

        {/* System Audit Log — REAL */}
        <div className={clsx("col-span-12 lg:col-span-7 flex flex-col", CARD)}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[#3f4943]"><Icon d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-3M8 3v4h4M15 4l5 5-8 8H7v-5z" /></span>
              <h3 className="text-[16px] font-semibold">Recent Activity</h3>
            </div>
            {/* This panel is a glance; the full, filterable trail lives at
                /admin/audit. */}
            <a
              href={auditHref}
              className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#005136] hover:underline"
            >
              Full audit trail →
            </a>
          </div>
          <div className="scroll-slim max-h-[360px] space-y-2 overflow-y-auto pr-2">
            {audit.length === 0 && <p className="py-8 text-center text-[13px] text-[#6f7a72]">No audit activity recorded yet.</p>}
            {audit.map((a) => {
              const open = expanded === a.id;
              return (
                <div key={a.id} className="overflow-hidden rounded-lg border border-[#bec9c0] bg-[#f8f9fa] transition-all hover:bg-[#edeeef]">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : a.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between p-3 text-left"
                  >
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

        {/* Liquidity — 24h volume real, reserve illustrative */}
        <div className={clsx("col-span-12 lg:col-span-5", CARD)}>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[#3f4943]"><Icon d="M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z" /></span>
            <h3 className="text-[16px] font-semibold">Liquidity</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-[#bec9c0] bg-[#f8f9fa] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#6f7a72]">24h Volume</p>
                <span className="rounded-full bg-[#006c49]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#006c49]">
                  From ledger
                </span>
              </div>
              <p className="mt-1 text-[28px] font-bold tabular-nums text-[#191c1d]">{volume24h}</p>
            </div>
            <div className="rounded-lg border border-[#bec9c0] bg-[#f8f9fa] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#6f7a72]">Reserve Balance</p>
                <IllustrativeTag />
              </div>
              <p className="mt-1 text-[28px] font-bold tabular-nums text-[#191c1d]">{reserveBalance}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

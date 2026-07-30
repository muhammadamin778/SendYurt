"use client";

import { useState } from "react";

/**
 * One entry in the audit trail, with its before/after expandable inline.
 *
 * The diff is the point: "role changed" is a note, "SUPPORT → ADMIN" is
 * evidence. Rows written before the typed columns existed only have
 * `metadata`, so that is rendered as a fallback rather than showing nothing.
 */

const TONE: Record<string, string> = {
  ROLE_CHANGE: "bg-[#006c49]/10 text-[#005136]",
  ROLE_PROMOTION: "bg-[#006c49]/10 text-[#005136]",
  ROLE_DEMOTION: "bg-[#735c00]/10 text-[#735c00]",
  USER_SUSPEND: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  USER_UNSUSPEND: "bg-[#006c49]/10 text-[#005136]",
  DATA_EXPORT: "bg-[#735c00]/10 text-[#735c00]",
  TRANSACTION_REVERSE: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  TRANSACTION_FAIL: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  TRANSACTION_DISPUTE: "bg-[#772f2c]/10 text-[#772f2c]",
};

function label(action: string): string {
  return action.replace(/_/g, " ").toLowerCase();
}

/** Flattens a JSON snapshot into `key: value` pairs for a compact diff. */
function pairs(value: unknown): Array<[string, string]> {
  if (value === null || value === undefined || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
}

export function AuditRow({
  action,
  actor,
  actorRole,
  targetType,
  targetUserId,
  ip,
  createdAtIso,
  before,
  after,
  metadata,
}: {
  action: string;
  actor: string;
  actorRole: string | null;
  targetType: string | null;
  targetUserId: string | null;
  ip: string | null;
  createdAtIso: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
}) {
  const [open, setOpen] = useState(false);

  const beforePairs = pairs(before);
  const afterPairs = pairs(after);
  const metaPairs = pairs(metadata);
  const hasDetail = beforePairs.length > 0 || afterPairs.length > 0 || metaPairs.length > 0 || Boolean(ip);

  // Pair up before/after by key so a change reads as "was → now".
  const changedKeys = Array.from(new Set([...beforePairs.map(([k]) => k), ...afterPairs.map(([k]) => k)]));
  const beforeMap = new Map(beforePairs);
  const afterMap = new Map(afterPairs);

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-[#f3f4f5] disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${TONE[action] ?? "bg-[#e7e8e9] text-[#3f4943]"}`}
        >
          {label(action)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-[#191c1d]">
            <span className="font-semibold">{actor}</span>
            {actorRole && <span className="text-[#6f7a72]"> ({actorRole.replace(/_/g, " ").toLowerCase()})</span>}
            {targetType && (
              <span className="text-[#3f4943]">
                {" · "}
                {targetType}
                {targetUserId ? ` ${targetUserId.slice(-8)}` : ""}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-[12px] tabular-nums text-[#6f7a72]">
          {new Date(createdAtIso).toISOString().replace("T", " ").slice(0, 16)}
        </span>
        {hasDetail && (
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 shrink-0 text-[#6f7a72] transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="border-t border-[#bec9c0]/40 bg-[#f8f9fa] px-6 py-4">
          {changedKeys.length > 0 && (
            <div className="mb-3 space-y-1">
              {changedKeys.map((k) => {
                const was = beforeMap.get(k);
                const now = afterMap.get(k);
                return (
                  <p key={k} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-semibold text-[#3f4943]">{k}</span>
                    <span className="rounded bg-[#ffdad6]/50 px-1.5 py-0.5 font-mono text-[12px] text-[#772f2c]">
                      {was ?? "—"}
                    </span>
                    <span className="text-[#6f7a72]">→</span>
                    <span className="rounded bg-[#006c49]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#005136]">
                      {now ?? "—"}
                    </span>
                  </p>
                );
              })}
            </div>
          )}

          {metaPairs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {metaPairs.map(([k, v]) => (
                <span key={k} className="rounded border border-[#bec9c0] bg-white px-1.5 py-0.5 text-[11px] text-[#3f4943]">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}

          {ip && (
            <p className="mt-3 text-[11px] text-[#6f7a72]">
              Origin {ip} — proxy-reported, recorded for correlation only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

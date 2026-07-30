"use client";

import { useState } from "react";
import { endImpersonation } from "@/app/actions/impersonation";

/**
 * Always-visible marker that this is someone else's account.
 *
 * Deliberately loud and deliberately not dismissible. The failure mode this
 * prevents is an operator forgetting which account they are looking at and
 * reporting a customer's balance as their own — so it names both people, and
 * shows the countdown so the session's end is never a surprise.
 *
 * It is `sticky`, not `fixed`: the shell below scrolls under a fixed bar and
 * would hide content behind it.
 */
export function ImpersonationBanner({
  operatorName,
  targetName,
  reason,
  minutesLeft,
}: {
  operatorName: string;
  targetName: string;
  reason: string;
  minutesLeft: number;
}) {
  const [busy, setBusy] = useState(false);

  async function exit() {
    setBusy(true);
    await endImpersonation();
    // Full navigation so the cleared cookie applies everywhere at once.
    window.location.href = "/en/admin/users";
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-[#8c1d18] bg-[#ba1a1a] px-4 py-2.5 text-white sm:px-8"
    >
      <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Read-only
      </span>

      <span className="min-w-0 flex-1 text-[13px]">
        <strong>{operatorName}</strong> is viewing <strong>{targetName}</strong>&rsquo;s account.
        Nothing can be changed here.{" "}
        <span className="text-white/80">
          {minutesLeft > 0 ? `Ends in ${minutesLeft} min` : "Ending now"} · {reason}
        </span>
      </span>

      <button
        type="button"
        onClick={exit}
        disabled={busy}
        className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#8c1d18] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}

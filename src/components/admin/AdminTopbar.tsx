"use client";

import { useEffect, useState } from "react";

const FEED = [
  "Polygon Network: peak congestion detected.",
  "New corridor: GBR → NGA now active.",
  "KYC systems: 1,420 profiles verified today.",
  "Liquidity pools: rebalancing in progress…",
  "Global latency: 42ms (optimal range).",
  "Daily volume target: 84% reached.",
];

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminTopbar({ name, initial, role }: { name: string; initial: string; role: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % FEED.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="fixed right-0 top-0 z-40 flex h-14 w-[calc(100%-260px)] items-center justify-between border-b border-[#bec9c0] bg-[#f8f9fa] px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a72]">
            <Icon d="M11 4a7 7 0 104.2 12.6L20 21m-4.8-4.4A7 7 0 0011 4z" className="h-5 w-5" />
          </span>
          <input
            type="search"
            placeholder="Search corridors, users, or TXIDs..."
            className="w-full rounded-full border border-[#bec9c0] bg-[#f3f4f5] py-1.5 pl-10 pr-4 text-[13px] text-[#191c1d] outline-none transition-all placeholder:text-[#6f7a72] focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/20"
          />
        </div>
        <div className="ml-4 hidden max-w-sm flex-1 items-center gap-2 overflow-hidden lg:flex">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#735c00] shadow-[0_0_8px_#735c00]" />
          <p className="truncate whitespace-nowrap border-r-2 border-[#006c49]/20 pr-1 text-[12px] text-[#6f7a72]" aria-live="polite">
            {FEED[i]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-[#3f4943] transition-colors hover:bg-[#e7e8e9]">
          <Icon d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#f8f9fa] bg-[#ba1a1a]" />
        </button>
        <button type="button" aria-label="Audit history" className="grid h-10 w-10 place-items-center rounded-full text-[#3f4943] transition-colors hover:bg-[#e7e8e9]">
          <Icon d="M12 8v5l3 2M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4" />
        </button>
        <div className="mx-2 h-6 w-px bg-[#bec9c0]" />
        <button type="button" className="flex items-center gap-3 rounded-full py-1 pl-2 pr-1 transition-colors hover:bg-[#e7e8e9]">
          <span className="text-right">
            <span className="block text-[12px] font-semibold text-[#191c1d]">{name}</span>
            <span className="block text-[10px] text-[#6f7a72]">{role}</span>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fed65b] text-[11px] font-bold text-[#745c00] shadow-inner">
            {initial}
          </span>
        </button>
      </div>
    </header>
  );
}

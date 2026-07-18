"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const FILTERS = [
  { key: "all", labelKey: "filterAll" },
  { key: "remittances", labelKey: "filterRemittances" },
  { key: "savings", labelKey: "filterSavings" },
  { key: "trust", labelKey: "filterTrust" },
] as const;

const RANGES = [
  { key: "30d", labelKey: "range30" },
  { key: "3m", labelKey: "range3m" },
  { key: "ytd", labelKey: "rangeYtd" },
  { key: "all", labelKey: "rangeAll" },
] as const;

export function HistoryControls({ filter, range, q }: { filter: string; range: string; q: string }) {
  const t = useTranslations("history");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);

  function apply(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("page"); // any control change resets to first page
    router.push(`${pathname}?${p.toString()}`);
  }

  // Debounce the search box → ?q=
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== q) apply({ q: search });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
      <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => apply({ filter: f.key === "all" ? "" : f.key })}
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                filter === f.key ? "bg-[#0a7c53] text-white" : "bg-[#eef2f6] text-[#64748b] hover:bg-[#e2e8f0]",
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {/* Search + range */}
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="w-full rounded-lg border-none bg-[#f1f5f9] py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#0a7c53] placeholder:text-[#94a3b8]"
            />
          </div>
          <div className="relative sm:w-48">
            <select
              value={range}
              onChange={(e) => apply({ range: e.target.value === "30d" ? "" : e.target.value })}
              className="w-full appearance-none rounded-lg border-none bg-[#f1f5f9] py-2 pl-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#0a7c53]"
            >
              {RANGES.map((r) => (
                <option key={r.key} value={r.key}>{t(r.labelKey)}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

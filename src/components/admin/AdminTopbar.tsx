"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { looksLikeTransactionId, normalizeTransactionQuery } from "@/lib/admin-search";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminTopbar({
  name,
  initial,
  role,
  locale,
}: {
  name: string;
  initial: string;
  role: string;
  locale: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  /**
   * One box, two destinations: an id-shaped query goes to the transaction
   * monitor, anything else searches users by name or email. The input
   * previously had no handler at all — typing and pressing Enter did nothing.
   */
  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const target = looksLikeTransactionId(q)
      ? `/${locale}/admin/transactions?q=${encodeURIComponent(normalizeTransactionQuery(q))}`
      : `/${locale}/admin/users?q=${encodeURIComponent(q)}&page=1`;
    router.push(target);
  }

  return (
    <header className="fixed right-0 top-0 z-40 flex h-14 w-[calc(100%-260px)] items-center justify-between border-b border-[#bec9c0] bg-[#f8f9fa] px-6">
      <form onSubmit={onSearch} role="search" className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a72]">
            <Icon d="M11 4a7 7 0 104.2 12.6L20 21m-4.8-4.4A7 7 0 0011 4z" className="h-5 w-5" />
          </span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users or transactions"
            placeholder="Search users by name or email, or a transaction ID…"
            className="w-full rounded-full border border-[#bec9c0] bg-[#f3f4f5] py-1.5 pl-10 pr-4 text-[13px] text-[#191c1d] outline-none transition-all placeholder:text-[#6f7a72] focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/20"
          />
        </div>
        {/* Enter submits; the control stays reachable for keyboard users. */}
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        {/* The notification bell was removed: `Notification` is a user-facing
            model, there is no admin notification feed, and its unread dot was
            hardcoded to always show. */}
        <Link
          href={`/${locale}/admin/settings`}
          aria-label="Audit history"
          title="Audit history"
          className="grid h-10 w-10 place-items-center rounded-full text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
        >
          <Icon d="M12 8v5l3 2M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4" />
        </Link>
        <div className="mx-2 h-6 w-px bg-[#bec9c0]" />
        {/* Not a button — there is no account menu behind it. */}
        <span className="flex items-center gap-3 py-1 pl-2 pr-1">
          <span className="text-right">
            <span className="block text-[12px] font-semibold text-[#191c1d]">{name}</span>
            <span className="block text-[10px] text-[#6f7a72]">{role}</span>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fed65b] text-[11px] font-bold text-[#745c00] shadow-inner">
            {initial}
          </span>
        </span>
      </div>
    </header>
  );
}

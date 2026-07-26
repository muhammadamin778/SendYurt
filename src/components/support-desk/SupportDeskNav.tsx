"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Permission } from "@/lib/permissions";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Top bar for the support workspace.
 *
 * Support's whole workflow starts with "find this customer", so lookup is the
 * primary control rather than a secondary icon. The link across to the
 * operations panel only appears for staff who can actually use it.
 */
export function SupportDeskNav({
  locale,
  permissions,
  name,
  initial,
  role,
}: {
  locale: string;
  permissions: readonly Permission[];
  name: string;
  initial: string;
  role: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const held = new Set(permissions);
  const canOpenOps = held.has("settings.view") || held.has("transaction.reverse");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/${locale}/support-desk?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#bec9c0] bg-white">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-4 px-6 py-3">
        <Link href={`/${locale}/support-desk`} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#005136] text-[13px] font-bold text-white">S</span>
          <span className="text-[16px] font-semibold tracking-[-0.01em] text-[#005136]">Support Desk</span>
        </Link>

        <form onSubmit={onSearch} role="search" className="flex min-w-[240px] flex-1 items-center">
          <div className="relative w-full max-w-lg">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a72]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M11 4a7 7 0 104.2 12.6L20 21m-4.8-4.4A7 7 0 0011 4z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find a customer by name or email"
              placeholder="Find a customer by name or email…"
              className="w-full rounded-full border border-[#bec9c0] bg-[#f3f4f5] py-2 pl-10 pr-4 text-[14px] text-[#191c1d] outline-none transition-all placeholder:text-[#6f7a72] focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/20"
            />
          </div>
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          {canOpenOps && (
            <Link
              href={`/${locale}/admin`}
              className="rounded-lg border border-[#bec9c0] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
            >
              Operations
            </Link>
          )}
          <span className="flex items-center gap-2">
            <span className="text-right">
              <span className="block text-[12px] font-semibold text-[#191c1d]">{name}</span>
              <span className="block text-[10px] text-[#6f7a72]">{role}</span>
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fed65b] text-[11px] font-bold text-[#745c00]">
              {initial}
            </span>
          </span>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await createBrowserSupabase().auth.signOut();
              window.location.assign(`/${locale}`);
            }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}

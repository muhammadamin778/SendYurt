"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Permission } from "@/lib/permissions";
import { createBrowserSupabase } from "@/lib/supabase/client";

const ICON = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  users: "M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a4 4 0 10-4-4 4 4 0 004 4zm0 2c-2.7 0-8 1.3-8 4v3h9v-3c0-1 .4-1.9 1.1-2.6C9.4 13.1 8.7 13 8 13zm8 0c-.3 0-.7 0-1.1.1 1.3.9 2.1 2.1 2.1 3.4V20h7v-3c0-2.7-5.3-4-8-4z",
  tx: "M4 6h16M4 6l3-3M4 6l3 3M20 18H4m16 0l-3-3m3 3l-3 3",
  support: "M12 3a9 9 0 00-9 9v5a2 2 0 002 2h1v-6H5v-1a7 7 0 0114 0v1h-1v6h1a2 2 0 002-2v-5a9 9 0 00-9-9z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.8 7.8 0 000-2l1.8-1.4-1.8-3.1-2.2.9a7.8 7.8 0 00-1.7-1l-.3-2.3H9.6l-.3 2.3a7.8 7.8 0 00-1.7 1l-2.2-.9L3.6 9.6 5.4 11a7.8 7.8 0 000 2l-1.8 1.4 1.8 3.1 2.2-.9a7.8 7.8 0 001.7 1l.3 2.3h3.8l.3-2.3a7.8 7.8 0 001.7-1l2.2.9 1.8-3.1z",
  logout: "M15 12H3m0 0l4-4m-4 4l4 4M13 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6",
  audit: "M12 8v5l3 2M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4",
};

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminSidebar({
  locale,
  permissions,
}: {
  locale: string;
  /** The viewer's permissions — nav items they can't use aren't rendered. */
  permissions: readonly Permission[];
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const base = `/${locale}/admin`;

  // Each destination declares the permission it needs; the same permission
  // guards the page server-side, so this filter can never open a door.
  // Grouped by the job being done rather than by database table — an operator
  // looks for "the thing I'm doing", not "the model it lives in".
  const held = new Set(permissions);
  const GROUPS: Array<{
    title: string;
    items: Array<{ label: string; icon: string; href: string; permission: Permission }>;
  }> = [
    {
      title: "Operations",
      items: [
        { label: "Dashboard", icon: ICON.dashboard, href: base, permission: "transaction.view" },
        { label: "Transactions", icon: ICON.tx, href: `${base}/transactions`, permission: "transaction.view" },
      ],
    },
    {
      title: "Support",
      items: [
        { label: "Customers", icon: ICON.users, href: `${base}/users`, permission: "customer.view" },
        { label: "Support desk", icon: ICON.support, href: `/${locale}/support-desk`, permission: "ticket.view" },
        { label: "Tickets", icon: ICON.support, href: `${base}/support`, permission: "ticket.view" },
      ],
    },
    {
      title: "Platform",
      items: [
        { label: "Audit trail", icon: ICON.audit, href: `${base}/audit`, permission: "settings.view" },
        { label: "Settings", icon: ICON.settings, href: `${base}/settings`, permission: "settings.view" },
      ],
    },
  ];

  // Drop items the role can't use, then drop groups left empty.
  const visibleGroups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => held.has(i.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-[#bec9c0] bg-[#f3f4f5] p-4">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#005136] text-white shadow-lg shadow-[#005136]/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-6 w-auto object-contain brightness-0 invert" />
        </span>
        <div>
          <h1 className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-[#005136]">SendYurt Admin</h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6f7a72]">Fintech Operations</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="scroll-slim scroll-hover-reveal flex-1 space-y-5 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f7a72]">
              {group.title}
            </p>
            {group.items.map((item) => {
              // Exact match for the dashboard root; prefix match elsewhere so a
              // sub-route still highlights its section.
              const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] transition-all",
                    active
                      ? "bg-[#006c49] text-white shadow-[0_0_15px_-3px_rgba(0,108,73,0.3)]"
                      : "text-[#3f4943] hover:bg-[#e7e8e9] hover:text-[#005136]",
                  )}
                >
                  <Glyph d={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-1 border-t border-[#bec9c0] pt-4">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] transition-colors hover:bg-[#e7e8e9]">
          <Glyph d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" />
          User App
        </Link>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            // The app authenticates through Supabase — the old /api/auth/signout
            // link hit NextAuth and left the real session intact.
            await createBrowserSupabase().auth.signOut();
            window.location.assign(`/${locale}`);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5 disabled:opacity-60"
        >
          <Glyph d={ICON.logout} />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

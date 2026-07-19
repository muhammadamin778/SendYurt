"use client";

import { clsx } from "clsx";
import { usePathname } from "next/navigation";

const ICON = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  users: "M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a4 4 0 10-4-4 4 4 0 004 4zm0 2c-2.7 0-8 1.3-8 4v3h9v-3c0-1 .4-1.9 1.1-2.6C9.4 13.1 8.7 13 8 13zm8 0c-.3 0-.7 0-1.1.1 1.3.9 2.1 2.1 2.1 3.4V20h7v-3c0-2.7-5.3-4-8-4z",
  tx: "M4 6h16M4 6l3-3M4 6l3 3M20 18H4m16 0l-3-3m3 3l-3 3",
  support: "M12 3a9 9 0 00-9 9v5a2 2 0 002 2h1v-6H5v-1a7 7 0 0114 0v1h-1v6h1a2 2 0 002-2v-5a9 9 0 00-9-9z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.8 7.8 0 000-2l1.8-1.4-1.8-3.1-2.2.9a7.8 7.8 0 00-1.7-1l-.3-2.3H9.6l-.3 2.3a7.8 7.8 0 00-1.7 1l-2.2-.9L3.6 9.6 5.4 11a7.8 7.8 0 000 2l-1.8 1.4 1.8 3.1 2.2-.9a7.8 7.8 0 001.7 1l.3 2.3h3.8l.3-2.3a7.8 7.8 0 001.7-1l2.2.9 1.8-3.1z",
  help: "M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.3a2.5 2.5 0 114.1 1.9c-.8.7-1.6 1.2-1.6 2.3M12 16.8v.2",
  logout: "M15 12H3m0 0l4-4m-4 4l4 4M13 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6",
  plus: "M12 5v14M5 12h14",
};

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;

  const NAV = [
    { label: "Dashboard", icon: ICON.dashboard, href: base, ready: true },
    { label: "Users", icon: ICON.users, href: `${base}/users`, ready: true },
    { label: "Transactions", icon: ICON.tx, href: `${base}/transactions`, ready: true },
    { label: "Support", icon: ICON.support, href: `${base}/support`, ready: true },
    { label: "Settings", icon: ICON.settings, href: `${base}/settings`, ready: true },
  ];

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

      {/* CTA */}
      <button
        type="button"
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#006c49] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:bg-[#005136] active:scale-95"
      >
        <Glyph d={ICON.plus} className="h-[18px] w-[18px]" />
        New Transaction
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.ready && pathname === item.href;
          const cls = clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] transition-all",
            active
              ? "bg-[#006c49] text-white shadow-[0_0_15px_-3px_rgba(0,108,73,0.3)]"
              : item.ready
                ? "text-[#3f4943] hover:bg-[#e7e8e9] hover:text-[#005136]"
                : "cursor-not-allowed text-[#6f7a72]/60",
          );
          if (!item.ready) {
            return (
              <div key={item.label} className={cls} aria-disabled="true" title="Coming soon">
                <Glyph d={item.icon} />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-[#e1e3e4] px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-[#6f7a72]">SOON</span>
              </div>
            );
          }
          return (
            <a key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={cls}>
              <Glyph d={item.icon} />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-1 border-t border-[#bec9c0] pt-4">
        <a href={`/${locale}/help`} className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] transition-colors hover:bg-[#e7e8e9]">
          <span className="text-[#3f4943] group-hover:text-[#005136]"><Glyph d={ICON.help} /></span>
          Help Center
        </a>
        <a href={`/${locale}/dashboard`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3f4943] transition-colors hover:bg-[#e7e8e9]">
          <Glyph d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" />
          User App
        </a>
        <a href="/api/auth/signout" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5">
          <Glyph d={ICON.logout} />
          Sign Out
        </a>
      </div>
    </aside>
  );
}

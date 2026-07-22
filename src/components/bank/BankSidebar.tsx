"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { YurtMark } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

type IconName =
  | "dashboard"
  | "wallet"
  | "rates"
  | "budget"
  | "trust"
  | "household"
  | "help"
  | "support"
  | "history"
  | "profile";

const NAV: { href: string; key: string; icon: IconName }[] = [
  { href: "/dashboard", key: "dashboard", icon: "dashboard" },
  { href: "/wallet", key: "wallet", icon: "wallet" },
  { href: "/rates", key: "rates", icon: "rates" },
  { href: "/budget", key: "budget", icon: "budget" },
  { href: "/trust", key: "trust", icon: "trust" },
  { href: "/household", key: "household", icon: "household" },
  { href: "/history", key: "history", icon: "history" },
  { href: "/support", key: "support", icon: "support" },
  { href: "/help", key: "help", icon: "help" },
  { href: "/profile", key: "profile", icon: "profile" },
];

function NavGlyph({ name }: { name: IconName }) {
  const p = { className: "h-[22px] w-[22px] shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.7, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (name) {
    case "dashboard":
      return (
        <svg {...p}><path d="M4 21V10l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 21v-7h6v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "wallet":
      return (
        <svg {...p}><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 12h4v-2h-4a1 1 0 000 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "rates":
      return (
        <svg {...p}><path d="M4 17l5-5 4 4 7-8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 8h5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "budget":
      return (
        <svg {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" strokeLinecap="round" /><path d="M16.5 14.5h.01" strokeLinecap="round" /></svg>
      );
    case "trust":
      return (
        <svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "household":
      return (
        <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="8" r="4" /><path d="M20 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "help":
      return (
        <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 114.1 1.9c-.8.7-1.6 1.2-1.6 2.3M12 16.8v.2" strokeLinecap="round" /></svg>
      );
    case "support":
      return (
        <svg {...p}><path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 20l1.3-3.9A8.4 8.4 0 013.6 12a8.4 8.4 0 018.4-8.4 8.4 8.4 0 019 7.9z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "history":
      return (
        <svg {...p}><path d="M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "profile":
      return (
        <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a5 5 0 015-5h2a5 5 0 015 5v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
  }
}

export function BankSidebar({
  name,
  initial,
  image,
  roleLabel,
  isAdmin = false,
}: {
  name: string;
  initial: string;
  image: string | null;
  roleLabel: string;
  /** Shows the admin-only jump link to /admin when true. */
  isAdmin?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="hidden w-[260px] shrink-0 self-start border-r border-[#e2e8f0] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col print:hidden">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <Link href="/dashboard" aria-label="SendYurt" className="flex items-center gap-2.5">
          <YurtMark className="h-10 w-auto" />
          <span className="leading-tight">
            <span className="block font-display text-[19px] font-bold tracking-tight text-[#0f172a]">
              SendYurt
            </span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Main">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
                    active
                      ? "bg-[#0a7c53] text-white shadow-sm"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
                  )}
                >
                  <NavGlyph name={item.icon} />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: CTA + user card + controls */}
      <div className="space-y-3 border-t border-[#eef2f7] px-3 pb-4 pt-4">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f2a44]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Admin panel
          </Link>
        )}

        <Link
          href="/rates"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#065f3e]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("sendMoney")}
        </Link>

        <div className="flex items-center gap-3 rounded-xl bg-[#f1f5f9] px-3 py-2.5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a7c53] to-[#065f3e] text-sm font-bold text-white">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[#0f172a]">{name}</div>
            <div className="truncate text-[11px] text-[#64748b]">{roleLabel}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <LanguageSwitcher />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LogoutButton className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]" />
          </div>
        </div>
      </div>
    </aside>
  );
}

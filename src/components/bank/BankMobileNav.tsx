"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/dashboard", key: "dashboard", d: "M4 21V10l8-6 8 6v11M9 21v-7h6v7" },
  { href: "/wallet", key: "wallet", d: "M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 12h4v-2h-4a1 1 0 000 2z" },
  { href: "/rates", key: "rates", d: "M4 17l5-5 4 4 7-8M15 8h5v5" },
  { href: "/budget", key: "budget", d: "M3 6h18v13H3zM3 10h18" },
  { href: "/trust", key: "trust", d: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" },
  { href: "/profile", key: "profile", d: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0" },
] as const;

export function BankMobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e8f0] bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden"
    >
      <ul className="grid grid-cols-6">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-[#0a7c53] before:absolute before:inset-x-6 before:top-0 before:h-[3px] before:rounded-full before:bg-[#0a7c53]"
                    : "text-[#b1b1b1]",
                )}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d={item.d} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

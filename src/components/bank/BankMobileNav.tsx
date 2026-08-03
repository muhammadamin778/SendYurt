"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * The six primary destinations.
 *
 * Profile is deliberately absent: the avatar in the header already goes there,
 * so the tab was a duplicate. Support takes its place, which puts "reach a
 * human" one tap away from every screen — the thing someone actually hunts for
 * on a phone.
 *
 * Labels use short forms. At six columns each tab gets ~62px on a 375px
 * screen, which is why "Rate finder" once rendered as "finder" and "Trust
 * score" as "score". The sidebar and drawer keep the full wording, where
 * there is room for it.
 */
const ITEMS = [
  { href: "/dashboard", key: "dashboard", d: "M4 21V10l8-6 8 6v11M9 21v-7h6v7" },
  { href: "/wallet", key: "wallet", d: "M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 12h4v-2h-4a1 1 0 000 2z" },
  { href: "/rates", key: "ratesShort", d: "M4 17l5-5 4 4 7-8M15 8h5v5" },
  { href: "/budget", key: "budget", d: "M3 6h18v13H3zM3 10h18" },
  { href: "/trust", key: "trustShort", d: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" },
  { href: "/support", key: "supportShort", d: "M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 20l1.3-3.9A8.4 8.4 0 013.6 12a8.4 8.4 0 018.4-8.4 8.4 8.4 0 019 7.9z" },
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
                  // min-h keeps every tab a 56px touch target even with a
                  // one-line label.
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-tight transition-colors",
                  active
                    ? "text-[#0a7c53] before:absolute before:inset-x-6 before:top-0 before:h-[3px] before:rounded-full before:bg-[#0a7c53]"
                    : "text-[#b1b1b1]",
                )}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d={item.d} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="w-full truncate text-center">{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

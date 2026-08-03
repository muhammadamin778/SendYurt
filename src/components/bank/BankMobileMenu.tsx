"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { NAV, NavGlyph } from "@/components/bank/nav-items";

/**
 * Full navigation for phones.
 *
 * The sidebar holds ten destinations but is `hidden … lg:flex`, and the bottom
 * bar shows six — so Family, History, Support, Help and the admin panel were
 * simply unreachable on a phone. There was no route to them at all, not a
 * cramped one.
 *
 * This drawer carries the same `NAV` list the sidebar renders, so the two
 * cannot drift, plus the admin jump, language switch and sign-out that also
 * lived only in the sidebar footer.
 */
export function BankMobileMenu({
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
  isAdmin?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes; the page beneath must not scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A tap on a link navigates without unmounting this component, so the sheet
  // has to be told to close on route change or it stays over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
        aria-expanded={open}
        aria-haspopup="dialog"
        // 44px square — the minimum comfortable touch target.
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#e2e8f0] hover:text-[#0f172a] lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-[#0f172a]/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="absolute inset-y-0 right-0 flex w-[min(19rem,86vw)] flex-col bg-white shadow-2xl"
          >
            {/* Who you are, so an operator or a shared phone is never ambiguous */}
            <div className="flex items-center gap-3 border-b border-[#eef2f7] px-4 py-4">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a7c53] to-[#065f3e] text-[15px] font-bold text-white">
                  {initial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-[#0f172a]">{name}</div>
                <div className="truncate text-[12px] text-[#64748b]">{roleLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
              <ul className="space-y-1">
                {NAV.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          // py-3 keeps every row a 48px target.
                          "flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
                          active
                            ? "bg-[#0a7c53] text-white"
                            : "text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
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

            <div className="space-y-2.5 border-t border-[#eef2f7] px-3 py-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f2a44]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Admin panel
                </Link>
              )}

              <div className="flex items-center justify-between gap-2 px-1">
                <LanguageSwitcher />
                <LogoutButton className="rounded-xl px-3 py-2 text-[13px] font-semibold text-[#b3261e] transition-colors hover:bg-[#fee2e2] disabled:opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

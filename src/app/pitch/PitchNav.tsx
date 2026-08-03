"use client";

import { useEffect, useState } from "react";

/**
 * Mobile navigation for the pitch site.
 *
 * The header used to lay Wordmark + language switch + "Log in" + CTA in a
 * single non-wrapping row. Their intrinsic widths total more than a 375px
 * screen, so the CTA — the one button the page exists to get pressed — was
 * pushed off the right edge. The section anchors were `hidden lg:flex` on top
 * of that, so a phone visitor could reach no nav link whatsoever.
 *
 * Below `lg` everything except the wordmark and the CTA now collapses into
 * this drawer, which leaves the header two items wide at any size.
 */

export interface PitchNavLink {
  href: string;
  label: string;
}

export function PitchNav({
  links,
  loginHref,
  loginLabel,
  langs,
  currentLang,
  menuLabel,
}: {
  links: PitchNavLink[];
  loginHref: string;
  loginLabel: string;
  langs: { code: string; label: string }[];
  currentLang: string;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes, and the page beneath must not scroll while the sheet is up.
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={menuLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        // 44px square — the minimum comfortable touch target.
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#0B1A30] transition-colors hover:bg-[#0B1A30]/6 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-[#0B1A30]/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={menuLabel}
            className="absolute inset-y-0 right-0 flex w-[min(19rem,85vw)] flex-col bg-[#f7f9fb] shadow-2xl"
          >
            <div className="flex h-16 items-center justify-end px-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-full text-[#0B1A30] transition-colors hover:bg-[#0B1A30]/6"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-6">
              <ul className="space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-[16px] font-medium text-[#0B1A30] transition-colors hover:bg-[#0B1A30]/6"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-[#0B1A30]/10 pt-4">
                <a
                  href={loginHref}
                  className="block rounded-xl px-4 py-3 text-[16px] font-semibold text-[#0a7c53] transition-colors hover:bg-[#0a7c53]/8"
                >
                  {loginLabel}
                </a>
              </div>

              <div className="mt-4 border-t border-[#0B1A30]/10 pt-4">
                <div className="flex gap-1.5 px-1">
                  {langs.map(({ code, label }) => (
                    <a
                      key={code}
                      href={code === "en" ? "/" : `/?lang=${code}`}
                      className={[
                        "flex-1 rounded-full px-3 py-2 text-center text-[14px] font-semibold transition-colors",
                        code === currentLang
                          ? "bg-[#0B1A30] text-[#f7f9fb]"
                          : "border border-[#0B1A30]/12 text-[#5A6B82]",
                      ].join(" ")}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

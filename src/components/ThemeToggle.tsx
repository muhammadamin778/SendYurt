"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// The inline script in the locale layout applies the stored theme before
// paint; this toggle just flips the class and persists the choice.
export function ThemeToggle() {
  const t = useTranslations("common");
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("sy-theme", next ? "dark" : "light");
    } catch {
      // Storage unavailable (private mode) — theme still applies this visit.
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("themeToggle")}
      title={t("themeToggle")}
      className="rounded-lg border border-sand-300 bg-white p-2 text-sand-800 transition-colors hover:bg-sand-100 motion-safe:active:scale-[0.95]"
    >
      {/* Render both, show one — avoids a hydration flash. */}
      <svg
        viewBox="0 0 24 24"
        className={isDark === true ? "hidden" : "h-4 w-4"}
        fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"
      >
        <path d="M12 3v1.5M12 19.5V21M4.6 4.6l1 1M18.4 18.4l1 1M3 12h1.5M19.5 12H21M4.6 19.4l1-1M18.4 5.6l1-1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className={isDark === true ? "h-4 w-4" : "hidden"}
        fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"
      >
        <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

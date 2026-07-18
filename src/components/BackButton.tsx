"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Goes to the previous view. Uses the browser history back when there is one,
 * otherwise falls back to the dashboard so it's never a dead end.
 */
export function BackButton() {
  const router = useRouter();
  const t = useTranslations("common");

  function onClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("back")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 bg-white px-2.5 py-2 text-sm font-semibold text-sand-800 transition-colors hover:bg-sand-100"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">{t("back")}</span>
    </button>
  );
}

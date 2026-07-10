"use client";

import { clsx } from "clsx";
import { useToasts } from "./toast";

// Bottom-center on mobile (above the tab bar), bottom-right on desktop.
// aria-live lets screen readers announce arrivals without focus theft.
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 print:hidden md:bottom-6 md:items-end md:pr-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-card",
            "motion-safe:animate-toast-in",
            t.kind === "success"
              ? "border-samarkand-200 bg-white text-samarkand-900 dark:border-night-line dark:bg-night-raised dark:text-samarkand-100"
              : "border-terracotta-300 bg-terracotta-50 text-terracotta-900",
          )}
        >
          {t.kind === "success" ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-samarkand-600" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-terracotta-600" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
            </svg>
          )}
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="×"
            className="ml-1 rounded p-0.5 text-sand-500 hover:text-ink dark:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

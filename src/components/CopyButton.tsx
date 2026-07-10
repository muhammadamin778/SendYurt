"use client";

import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations("household");

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast(t("copied"));
        } catch {
          toast(t("copyFailed"), "error");
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-samarkand-300 bg-white px-3 py-1.5 text-sm font-semibold text-samarkand-800 transition-colors hover:bg-samarkand-50 motion-safe:active:scale-[0.97] dark:border-night-line dark:bg-night-raised dark:text-samarkand-200"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" />
      </svg>
      {t("copy")}
    </button>
  );
}

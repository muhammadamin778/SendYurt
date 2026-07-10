"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

// The browser's print dialog doubles as "Save as PDF" everywhere — no
// PDF library, no server rendering, and the result is a real document.
export function PrintButton({ label }: { label?: string }) {
  const t = useTranslations("trust.report");
  return (
    <Button onClick={() => window.print()}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="14" width="12" height="7" />
      </svg>
      {label ?? t("download")}
    </Button>
  );
}

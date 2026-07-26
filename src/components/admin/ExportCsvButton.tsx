"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import type { ExportResult } from "@/app/actions/admin-export";

/**
 * Triggers a server-side, audited CSV export and saves the result.
 *
 * The CSV is built on the server so the row scope and the `DATA_EXPORT` audit
 * row can't be bypassed; the browser only turns the returned string into a
 * download.
 */
export function ExportCsvButton({
  action,
  label = "Export CSV",
  className,
}: {
  /** Bound server action returning the CSV payload. */
  action: () => Promise<ExportResult>;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const result = await action();
    setBusy(false);

    if (!result.ok) {
      toast(result.error === "forbidden" ? "You don't have permission to export." : "Export failed.", "error");
      return;
    }

    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export ready.");
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={
        className ??
        "flex items-center gap-2 rounded-lg border border-[#006c49] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#006c49] transition-colors hover:bg-[#006c49]/10 disabled:opacity-60"
      }
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? "Exporting…" : label}
    </button>
  );
}

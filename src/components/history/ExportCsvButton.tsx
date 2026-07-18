"use client";

import { useTranslations } from "next-intl";

/** Rows are pre-formatted string tuples so the CSV matches the visible table. */
export function ExportCsvButton({ headers, rows, filename = "sendyurt-history.csv" }: { headers: string[]; rows: string[][]; filename?: string }) {
  const t = useTranslations("history");

  function escape(v: string) {
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }

  function download() {
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="flex items-center gap-2 rounded-lg bg-[#0a7c53] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#065f3e] active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("exportCsv")}
    </button>
  );
}

"use client";

export interface CsvUser {
  name: string;
  email: string;
  accountAge: string;
  trust: number | null;
  status: string;
  admin: boolean;
}

/** Builds and downloads a CSV of the current user page — no server round-trip. */
export function ExportUsersCsv({ rows }: { rows: CsvUser[] }) {
  function download() {
    const head = ["Name", "Email", "Account age", "Trust score", "Status", "Admin"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      head.join(","),
      ...rows.map((r) => [r.name, r.email, r.accountAge, r.trust ?? "", r.status, r.admin ? "yes" : "no"].map((v) => esc(String(v))).join(",")),
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sendyurt-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="flex items-center gap-2 rounded-lg border border-[#006c49] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#006c49] transition-colors hover:bg-[#006c49]/10"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Export CSV
    </button>
  );
}

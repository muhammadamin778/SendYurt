"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTransaction } from "@/app/actions/budget";

export function DeleteTransactionButton({ id }: { id: string }) {
  const t = useTranslations("budget");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={t("deleteTransaction")}
      title={t("deleteTransaction")}
      onClick={async () => {
        if (!window.confirm(t("deleteConfirm"))) return;
        setBusy(true);
        const result = await deleteTransaction(id);
        setBusy(false);
        if (result.ok) router.refresh();
      }}
      className="rounded p-1.5 text-sand-500 hover:bg-terracotta-50 hover:text-terracotta-700 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

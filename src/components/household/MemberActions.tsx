"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeMember } from "@/app/actions/household";
import { toast } from "@/components/ui/toast";

export function RemoveMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const t = useTranslations("household");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${t("roleViewer")} — ${name}`}
      title={t("removeConfirm")}
      onClick={async () => {
        if (!window.confirm(t("removeConfirm"))) return;
        setBusy(true);
        const result = await removeMember({ memberId });
        setBusy(false);
        if (result.ok) {
          toast(t("removed"));
          router.refresh();
        } else {
          toast(t("removeFailed"), "error");
        }
      }}
      className="rounded-lg p-2 text-[#ef4444] transition-all hover:bg-[#fee2e2] disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM17 11h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function InviteMemberButton({ inviteCode }: { inviteCode: string }) {
  const t = useTranslations("household");

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(inviteCode);
          toast(t("inviteCopied"));
        } catch {
          toast(inviteCode);
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] px-4 py-3 font-bold text-white shadow-sm transition-all hover:bg-[#065f3e] active:scale-95 md:w-auto"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("inviteMember")}
    </button>
  );
}

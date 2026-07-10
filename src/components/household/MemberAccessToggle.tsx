"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setMemberAccess } from "@/app/actions/household";
import { toast } from "@/components/ui/toast";

export function MemberAccessToggle({
  memberId,
  accessRole,
}: {
  memberId: string;
  accessRole: string;
}) {
  const t = useTranslations("household");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = accessRole === "ADMIN" ? "VIEWER" : "ADMIN";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await setMemberAccess({ memberId, accessRole: next });
        setBusy(false);
        if (result.ok) {
          toast(t("accessChanged"));
          router.refresh();
        } else {
          toast(t("accessChangeFailed"), "error");
        }
      }}
      className="rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-sand-800 transition-colors hover:bg-sand-100 disabled:opacity-50 motion-safe:active:scale-[0.97]"
    >
      {next === "VIEWER" ? t("makeViewer") : t("makeAdmin")}
    </button>
  );
}

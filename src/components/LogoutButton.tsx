"use client";

import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";

export function LogoutButton({
  className,
  children,
}: {
  className?: string;
  /** Optional custom content (e.g. an icon). Falls back to the "Log out" label. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={t("logOut")}
      onClick={async () => {
        setBusy(true);
        await signOut({ callbackUrl: `/${locale}` });
      }}
      className={
        className ??
        "rounded-lg px-3 py-2 text-sm font-semibold text-sand-800 hover:bg-sand-100 disabled:opacity-60"
      }
    >
      {children ?? t("logOut")}
    </button>
  );
}

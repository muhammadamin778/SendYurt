"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Sign out, with a confirmation step.
 *
 * The topbar previously carried a bare icon button that ended the session on a
 * single tap, sitting between the notification bell and the avatar — easy to
 * hit by accident on a phone, and unlabelled, so there was no way to know what
 * it did before pressing it. Signing out is not destructive, but on a shared
 * or borrowed phone getting back in means finding the password again, so it
 * should be deliberate.
 *
 * The confirm step is inline rather than a modal: the panel already sits at
 * the bottom of Settings, where nothing is competing for attention.
 */
export function SignOutPanel() {
  const t = useTranslations("common");
  const tp = useTranslations("profile");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    // A full navigation, not a router push: the session cookie has changed and
    // every cached server render for this user must be discarded.
    window.location.assign(`/${locale}`);
  }

  return (
    <section>
      <h3 className="mb-3 text-[20px] font-semibold text-[#0f172a]">{tp("signOutTitle")}</h3>
      <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4">
        {!confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-[#0f172a]">{t("logOut")}</p>
              <p className="text-xs text-[#94a3b8]">{tp("signOutDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="shrink-0 rounded-xl border border-[#fecaca] bg-white px-4 py-2.5 text-sm font-semibold text-[#b3261e] transition-colors hover:bg-[#fee2e2]"
            >
              {t("logOut")}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[15px] font-semibold text-[#0f172a]">{tp("signOutConfirm")}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">{tp("signOutConfirmDesc")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className="rounded-xl bg-[#b3261e] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? tp("signOutBusy") : tp("signOutYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0f172a] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60"
              >
                {tp("signOutCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

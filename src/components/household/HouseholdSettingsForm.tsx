"use client";

import { clsx } from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { updateHouseholdSettings } from "@/app/actions/household";
import { toast } from "@/components/ui/toast";

const LOCALE_LABELS: Record<string, string> = { uz: "Oʻzbek", ru: "Русский", en: "English" };
const CURRENCIES = ["UZS", "USD", "EUR"] as const;
const CURRENCY_LABELS: Record<string, string> = {
  UZS: "UZS - Uzbekistani soʻm",
  USD: "USD - US Dollar",
  EUR: "EUR - Euro",
};

interface Settings {
  name: string;
  currency: string;
  privacyMode: boolean;
  trustScoreSharing: boolean;
}

function Toggle({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "relative inline-block h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
        on ? "bg-[#0a7c53]" : "bg-[#cbd5e1]",
      )}
    >
      <span className={clsx("absolute top-1 h-4 w-4 rounded-full bg-white transition-transform", on ? "translate-x-7" : "translate-x-1")} />
    </button>
  );
}

export function HouseholdSettingsForm({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const t = useTranslations("household");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [currency, setCurrency] = useState(initial.currency);
  const [privacyMode, setPrivacyMode] = useState(initial.privacyMode);
  const [trustScoreSharing, setTrustScoreSharing] = useState(initial.trustScoreSharing);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== initial.name ||
    currency !== initial.currency ||
    privacyMode !== initial.privacyMode ||
    trustScoreSharing !== initial.trustScoreSharing;

  function reset() {
    setName(initial.name);
    setCurrency(initial.currency);
    setPrivacyMode(initial.privacyMode);
    setTrustScoreSharing(initial.trustScoreSharing);
  }

  async function save() {
    setSaving(true);
    const result = await updateHouseholdSettings({ name: name.trim(), currency, privacyMode, trustScoreSharing });
    setSaving(false);
    if (result.ok) {
      toast(t("saved"));
      router.refresh();
    } else {
      toast(t("saveFailed"), "error");
    }
  }

  function switchLocale(next: string) {
    startTransition(() => {
      // @ts-expect-error params are compatible with the typed route
      router.replace({ pathname, params }, { locale: next });
    });
  }

  return (
    <>
      {/* General Settings */}
      <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-[20px] font-semibold text-[#0f172a]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.8 7.8 0 000-2l1.8-1.4-1.8-3.1-2.2.9a7.8 7.8 0 00-1.7-1l-.3-2.3H9.6l-.3 2.3a7.8 7.8 0 00-1.7 1l-2.2-.9L3.6 9.6 5.4 11a7.8 7.8 0 000 2l-1.8 1.4 1.8 3.1 2.2-.9a7.8 7.8 0 001.7 1l.3 2.3h3.8l.3-2.3a7.8 7.8 0 001.7-1l2.2.9 1.8-3.1z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("generalSettings")}
        </h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#64748b]">{t("householdName")}</label>
          <input
            type="text"
            value={name}
            disabled={!canEdit}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[#0f172a] outline-none transition-all focus:border-[#0a7c53] focus:ring-1 focus:ring-[#0a7c53] disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#64748b]">{t("primaryCurrency")}</label>
          <select
            value={currency}
            disabled={!canEdit}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[#0f172a] outline-none transition-all focus:border-[#0a7c53] focus:ring-1 focus:ring-[#0a7c53] disabled:opacity-60"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#64748b]">{t("languagePrefs")}</label>
          <div className="flex gap-2">
            {routing.locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                className={clsx(
                  "flex-1 rounded-lg py-2 text-sm transition-colors",
                  l === locale
                    ? "border-2 border-[#0a7c53] bg-[#0a7c53]/10 font-bold text-[#0a7c53]"
                    : "border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]",
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Access */}
      <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-[20px] font-semibold text-[#0f172a]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("securityAccess")}
        </h3>

        <div className="flex items-center justify-between rounded-lg bg-[#f8fafc] p-3">
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{t("privacyMode")}</p>
            <p className="text-xs text-[#64748b]">{t("privacyModeDesc")}</p>
          </div>
          <Toggle on={privacyMode} disabled={!canEdit} onClick={() => setPrivacyMode((v) => !v)} label={t("privacyMode")} />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[#f8fafc] p-3">
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{t("trustSharing")}</p>
            <p className="text-xs text-[#64748b]">{t("trustSharingDesc")}</p>
          </div>
          <Toggle on={trustScoreSharing} disabled={!canEdit} onClick={() => setTrustScoreSharing((v) => !v)} label={t("trustSharing")} />
        </div>

        <button
          type="button"
          onClick={() => toast(t("verifyComingSoon"))}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#0a7c53]/40 py-2 text-sm font-bold text-[#0a7c53] transition-colors hover:bg-[#0a7c53]/10"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("verifyIdentity")}
        </button>
      </section>

      {/* Sticky save bar */}
      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 lg:bottom-6 lg:left-[260px] lg:right-8 lg:px-0">
          <div className="flex items-center justify-between gap-4 rounded-none border-t border-[#e2e8f0] bg-white p-4 shadow-lg lg:rounded-2xl lg:border">
            <p className="hidden text-sm text-[#64748b] sm:block">{t("unsavedChanges")}</p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl border border-[#e2e8f0] px-6 py-3 font-bold text-[#64748b] transition-colors hover:bg-[#f1f5f9] sm:flex-none"
              >
                {t("discard")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#0a7c53] px-8 py-3 font-bold text-white transition-all hover:bg-[#065f3e] active:scale-95 disabled:opacity-60 sm:flex-none"
              >
                {t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { AuthField } from "@/components/auth/AuthField";
import { passwordStrength } from "@/lib/password-strength";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Role = "SENDER" | "RECEIVER";
type HouseholdMode = "create" | "join";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" strokeLinecap="round" /></svg>
);
const MailIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const LockIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" /></svg>
);
const HomeIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const TicketIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4z" strokeLinejoin="round" /></svg>
);

function EyeButton({ shown, onClick, label }: { shown: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-6 w-6 place-items-center text-[#64748b] transition-colors hover:text-[#0a7c53]">
      {shown ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.2A9.3 9.3 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5M6.1 6.2C3.8 7.6 2 10 2 12c0 2.5 4 7 10 7 1.3 0 2.5-.2 3.6-.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}

function ChoiceCard({
  selected,
  title,
  body,
  onSelect,
}: {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        "rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0a7c53]",
        selected
          ? "border-[#0a7c53] bg-[#0a7c53]/[0.07] ring-1 ring-[#0a7c53]"
          : "border-[#e2e8f0] bg-white hover:border-[#0a7c53]/50",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={clsx(
            "grid h-4 w-4 place-items-center rounded-full border-2",
            selected ? "border-[#0a7c53] bg-[#0a7c53]" : "border-[#cbd5e1]",
          )}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-sm font-semibold text-[#0f172a]">{title}</span>
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-[#64748b]">{body}</span>
    </button>
  );
}

// weak → 1 bar, fair → 2 bars, strong → 4 bars
const strengthMeta = {
  weak: { bars: 1, color: "bg-[#ef4444]", text: "text-[#ef4444]" },
  fair: { bars: 2, color: "bg-[#f59e0b]", text: "text-[#b45309]" },
  strong: { bars: 4, color: "bg-[#0a7c53]", text: "text-[#0a7c53]" },
} as const;

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const [role, setRole] = useState<Role>("SENDER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [householdMode, setHouseholdMode] = useState<HouseholdMode>("create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pw = useMemo(() => passwordStrength(password), [password]);
  const meta = strengthMeta[pw.strength];

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = t("errorNameShort");
    if (!EMAIL_RE.test(email.trim())) errors.email = t("errorInvalidEmail");
    if (!pw.meetsMinimum) errors.password = t("errorPasswordWeak");
    if (householdMode === "create" && householdName.trim().length < 2) errors.householdName = t("errorHouseholdNameShort");
    if (householdMode === "join" && inviteCode.trim().length !== 8) errors.inviteCode = t("errorInviteCodeFormat");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Create the account via a server-side RPC that provisions an
      // already-confirmed user (the DB trigger then creates the profile +
      // wallet(0)). This avoids Supabase's confirmation email — whose small
      // built-in quota otherwise fails sign-up with "email rate limit
      // exceeded". The family role + household choice ride in user metadata
      // and are applied when the account first reaches the app.
      const supabase = createBrowserSupabase();
      const { error: signupError } = await supabase.rpc("app_signup", {
        p_email: email.trim(),
        p_password: password,
        p_full_name: name.trim(),
        p_role: role,
        p_household_mode: householdMode,
        p_household_name: householdMode === "create" ? householdName.trim() : null,
        p_invite_code: householdMode === "join" ? inviteCode.trim().toUpperCase() : null,
      });

      if (signupError) {
        const msg = signupError.message || "";
        if (/EMAIL_TAKEN/.test(msg)) setFieldErrors({ email: t("errorEmailTaken") });
        else if (/INVALID_EMAIL/.test(msg)) setFieldErrors({ email: t("errorInvalidEmail") });
        else if (/WEAK_PASSWORD/.test(msg)) setFieldErrors({ password: t("errorPasswordWeak") });
        else setFormError(msg || t("errorGeneric"));
        setSubmitting(false);
        return;
      }

      // Sign straight in with the same credentials.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        window.location.assign(`/${locale}/login`);
        return;
      }
      window.location.assign(`/${locale}/welcome`);
    } catch {
      setFormError(t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-[32px] font-bold leading-tight text-[#0f172a]">{t("registerTitle")}</h1>
      <p className="mt-2 text-[15px] text-[#64748b]">{t("registerSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
        {formError && (
          <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-[13px] font-medium text-[#b91c1c]">
            {formError}
          </p>
        )}

        <AuthField id="reg-name" label={t("name")} name="name" autoComplete="name" required icon={UserIcon} placeholder="Jasur Alimov" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <AuthField id="reg-email" label={t("email")} type="email" name="email" autoComplete="email" required icon={MailIcon} placeholder="jasur@example.uz" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} valid={EMAIL_RE.test(email.trim())} />

        <div>
          <AuthField
            id="reg-password"
            label={t("password")}
            type={showPw ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            required
            icon={LockIcon}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            trailing={<EyeButton shown={showPw} onClick={() => setShowPw((v) => !v)} label={t("password")} />}
          />
          {/* Strength meter */}
          <div className="mt-2.5" aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={clsx("h-1 flex-1 rounded-full transition-colors", password.length > 0 && i < meta.bars ? meta.color : "bg-[#e0e3e5]")} />
              ))}
            </div>
            <p className={clsx("mt-1 text-[11px] font-medium uppercase tracking-wider", password.length > 0 ? meta.text : "text-[#94a3b8]")}>
              {password.length > 0 ? t(`passwordStrength.${pw.strength}`) : t("passwordStrengthLabel")}
            </p>
          </div>
        </div>

        {/* Role — kept requirement */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[#0f172a]">{t("roleQuestion")}</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-3">
            <ChoiceCard selected={role === "SENDER"} title={t("roleSenderTitle")} body={t("roleSenderBody")} onSelect={() => setRole("SENDER")} />
            <ChoiceCard selected={role === "RECEIVER"} title={t("roleReceiverTitle")} body={t("roleReceiverBody")} onSelect={() => setRole("RECEIVER")} />
          </div>
        </fieldset>

        {/* Household — kept requirement */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[#0f172a]">{t("householdQuestion")}</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-3">
            <ChoiceCard selected={householdMode === "create"} title={t("householdCreateTitle")} body={t("householdCreateBody")} onSelect={() => setHouseholdMode("create")} />
            <ChoiceCard selected={householdMode === "join"} title={t("householdJoinTitle")} body={t("householdJoinBody")} onSelect={() => setHouseholdMode("join")} />
          </div>
          <div className="mt-3">
            {householdMode === "create" ? (
              <AuthField id="reg-household" label={t("householdName")} name="householdName" required icon={HomeIcon} value={householdName} onChange={(e) => setHouseholdName(e.target.value)} error={fieldErrors.householdName} placeholder={t("householdNamePlaceholder")} />
            ) : (
              <AuthField id="reg-invite" label={t("inviteCode")} name="inviteCode" required icon={TicketIcon} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} error={fieldErrors.inviteCode} hint={t("inviteCodeHint")} maxLength={8} className="font-mono tracking-widest" />
            )}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
          ) : (
            <>
              {t("registerButton")}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </>
          )}
        </button>
      </form>

      {/* Trust element */}
      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-[#0a7c53]/15 bg-[#0a7c53]/[0.06] p-4">
        <div className="flex shrink-0 -space-x-2">
          {[
            ["#0a7c53", "A"],
            ["#0f8a5f", "D"],
            ["#d9a441", "M"],
          ].map(([bg, ch]) => (
            <span key={ch} className="grid h-9 w-9 place-items-center rounded-full border-2 border-white text-xs font-bold text-white" style={{ backgroundColor: bg }}>
              {ch}
            </span>
          ))}
        </div>
        <p className="text-[13px] leading-tight text-[#065f3e]">{t("registerTrust")}</p>
      </div>

      {/* Sign-in link */}
      <p className="mt-8 text-[15px] text-[#64748b]">
        {t("haveAccount")}{" "}
        <Link href="/login" className="ml-1 font-bold text-[#0a7c53] underline-offset-4 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}

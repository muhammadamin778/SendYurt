"use client";

import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { AuthField } from "@/components/auth/AuthField";
import { toast } from "@/components/ui/toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MailIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LockIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" />
  </svg>
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

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t("errorMissingFields"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setError(res.error === "rate_limited" ? t("errorRateLimited") : t("errorInvalidCredentials"));
        setSubmitting(false);
        return;
      }
      const from = searchParams.get("from");
      const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
      window.location.assign(safeFrom ?? `/${locale}/dashboard`);
    } catch {
      setError(t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Welcome */}
      <h1 className="font-display text-[32px] font-bold leading-tight text-[#0f172a]">{t("loginTitle")}</h1>
      <p className="mt-2 text-[15px] text-[#64748b]">{t("loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
        {error && (
          <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-[13px] font-medium text-[#b91c1c]">
            {error}
          </p>
        )}

        <AuthField
          id="login-email"
          label={t("email")}
          type="email"
          name="email"
          autoComplete="email"
          required
          icon={MailIcon}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          valid={EMAIL_RE.test(email.trim())}
          placeholder="name@example.com"
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#45464d]">{t("password")}</span>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-[#0a7c53] hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>
          <AuthField
            id="login-password"
            label=""
            type={showPw ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            icon={LockIcon}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            trailing={<EyeButton shown={showPw} onClick={() => setShowPw((v) => !v)} label={t("password")} />}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#0a7c53]/25 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
          ) : (
            <>
              {t("loginButton")}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-1">
          <span className="h-px flex-1 bg-[#e2e8f0]" />
          <span className="text-[13px] font-medium text-[#94a3b8]">{t("orDivider")}</span>
          <span className="h-px flex-1 bg-[#e2e8f0]" />
        </div>

        {/* Google SSO (presentational — no OAuth backend yet) */}
        <button
          type="button"
          onClick={() => toast(t("googleUnavailable"))}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#0f172a] bg-transparent py-3.5 text-[15px] font-semibold text-[#0f172a] transition-colors hover:bg-[#f2f4f6]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 9.82-4.53z" />
          </svg>
          {t("continueGoogle")}
        </button>
      </form>

      {/* Sign-up */}
      <p className="mt-12 text-center text-[15px] text-[#64748b]">
        {t("loginNoAccount")}{" "}
        <Link href="/register" className="font-bold text-[#0a7c53] hover:underline">
          {t("loginSignUp")}
        </Link>
      </p>

      {/* Footer links */}
      <div className="mt-16 flex justify-center gap-6 text-[13px] text-[#94a3b8]">
        <Link href="/pitch" className="transition-colors hover:text-[#45464d]">{t("footerPrivacy")}</Link>
        <Link href="/pitch" className="transition-colors hover:text-[#45464d]">{t("footerTerms")}</Link>
        <Link href="/pitch" className="transition-colors hover:text-[#45464d]">{t("footerSupport")}</Link>
      </div>
    </div>
  );
}

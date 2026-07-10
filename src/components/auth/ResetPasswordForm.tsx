"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { passwordStrength } from "@/lib/password-strength";

const strengthStyles = {
  weak: { width: "w-1/3", color: "bg-terracotta-600" },
  fair: { width: "w-2/3", color: "bg-sand-500" },
  strong: { width: "w-full", color: "bg-samarkand-600" },
} as const;

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pw = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!pw.meetsMinimum) nextErrors.password = t("errorPasswordWeak");
    if (confirm !== password) nextErrors.confirm = t("errorPasswordMismatch");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.status === 429) {
        setError(t("errorRateLimited"));
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === "invalid_token" ? t("errorResetTokenInvalid") : t("errorGeneric"),
        );
        return;
      }
      setDone(true);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card shape="arch" className="p-6 pt-12 sm:p-8 sm:pt-14">
        <h1 className="font-display text-2xl font-bold text-samarkand-950">
          {t("resetTitle")}
        </h1>
        <Alert kind="error" className="mt-6">
          {t("errorResetTokenMissing")}
        </Alert>
        <Link
          href="/forgot-password"
          className="mt-4 block text-center text-sm font-semibold text-samarkand-700 hover:underline"
        >
          {t("forgotTitle")}
        </Link>
      </Card>
    );
  }

  return (
    <Card shape="arch" className="p-6 pt-12 sm:p-8 sm:pt-14">
      <h1 className="font-display text-2xl font-bold text-samarkand-950">
        {t("resetTitle")}
      </h1>
      <p className="mt-1 text-sm text-sand-800">{t("resetSubtitle")}</p>

      {done ? (
        <div className="mt-6 space-y-4">
          <Alert kind="success">{t("resetDone")}</Alert>
          <Link
            href="/login"
            className="block rounded-lg bg-samarkand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-samarkand-800"
          >
            {t("loginButton")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <Input
              label={t("newPassword")}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint={t("passwordHint")}
            />
            {password.length > 0 && (
              <div className="mt-2" aria-live="polite">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-200">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      strengthStyles[pw.strength].width,
                      strengthStyles[pw.strength].color,
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-sand-700">
                  {t(`passwordStrength.${pw.strength}`)}
                </p>
              </div>
            )}
          </div>
          <Input
            label={t("confirmPassword")}
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
          <Button type="submit" full loading={submitting}>
            {t("resetButton")}
          </Button>
        </form>
      )}
    </Card>
  );
}


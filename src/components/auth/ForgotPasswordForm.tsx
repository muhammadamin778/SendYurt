"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Shows the same confirmation whether or not the email exists, so the
// form can't be used to probe for registered accounts. In development the
// API returns the reset link directly (no mail transport yet) and we
// surface it for manual testing.
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("errorInvalidEmail"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        setError(t("errorRateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("errorGeneric"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
      setSent(true);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card accent className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-bold text-samarkand-950">
        {t("forgotTitle")}
      </h1>
      <p className="mt-1 text-sm text-sand-800">{t("forgotSubtitle")}</p>

      {sent ? (
        <div className="mt-6 space-y-4">
          <Alert kind="success">{t("forgotSent")}</Alert>
          {devResetUrl && (
            <Alert kind="info">
              <span className="font-semibold">dev:</span>{" "}
              <a href={devResetUrl} className="break-all underline">
                {devResetUrl}
              </a>
            </Alert>
          )}
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-samarkand-700 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <Input
            label={t("email")}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" full loading={submitting}>
            {t("forgotButton")}
          </Button>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-samarkand-700 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </form>
      )}
    </Card>
  );
}

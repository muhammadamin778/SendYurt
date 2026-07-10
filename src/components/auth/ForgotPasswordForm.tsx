"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Placeholder flow: no reset email is sent yet. We deliberately show the
// same confirmation regardless of whether the email exists, so the form
// can't be used to probe for registered accounts once it goes live.
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("errorInvalidEmail"));
      return;
    }
    setSent(true);
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
          <Button type="submit" full>
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

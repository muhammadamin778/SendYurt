"use client";

import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(
          res.error === "rate_limited"
            ? t("errorRateLimited")
            : t("errorInvalidCredentials"),
        );
        setSubmitting(false);
        return;
      }
      // Full navigation so the new session cookie is picked up everywhere.
      const from = searchParams.get("from");
      const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
      window.location.assign(safeFrom ?? `/${locale}/dashboard`);
    } catch {
      setError(t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <Card accent className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-bold text-samarkand-950">
        {t("loginTitle")}
      </h1>
      <p className="mt-1 text-sm text-sand-800">{t("loginSubtitle")}</p>

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
        <Input
          label={t("password")}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-samarkand-700 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" full loading={submitting}>
          {t("loginButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-sand-800">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-samarkand-700 hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </Card>
  );
}

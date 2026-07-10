"use client";

import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { passwordStrength } from "@/lib/password-strength";

type Role = "SENDER" | "RECEIVER";
type HouseholdMode = "create" | "join";

function RoleCard({
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
        "rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-samarkand-700",
        selected
          ? "border-samarkand-600 bg-samarkand-50 ring-1 ring-samarkand-600"
          : "border-sand-300 bg-white hover:border-samarkand-400",
      )}
    >
      <span className="block text-sm font-semibold text-samarkand-950">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-sand-800">{body}</span>
    </button>
  );
}

const strengthStyles = {
  weak: { width: "w-1/3", color: "bg-terracotta-600" },
  fair: { width: "w-2/3", color: "bg-sand-500" },
  strong: { width: "w-full", color: "bg-samarkand-600" },
} as const;

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const [role, setRole] = useState<Role>("SENDER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdMode, setHouseholdMode] = useState<HouseholdMode>("create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pw = useMemo(() => passwordStrength(password), [password]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = t("errorNameShort");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("errorInvalidEmail");
    if (!pw.meetsMinimum) errors.password = t("errorPasswordWeak");
    if (householdMode === "create" && householdName.trim().length < 2) {
      errors.householdName = t("errorHouseholdNameShort");
    }
    if (householdMode === "join" && inviteCode.trim().length !== 8) {
      errors.inviteCode = t("errorInviteCodeFormat");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          householdMode,
          householdName: householdMode === "create" ? householdName.trim() : undefined,
          inviteCode: householdMode === "join" ? inviteCode.trim().toUpperCase() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setFormError(t("errorRateLimited"));
        } else if (data.error === "email_taken") {
          setFieldErrors({ email: t("errorEmailTaken") });
        } else if (data.error === "invalid_invite_code") {
          setFieldErrors({ inviteCode: t("errorInviteCodeInvalid") });
        } else {
          setFormError(t("errorGeneric"));
        }
        setSubmitting(false);
        return;
      }

      // Registered — sign in with the same credentials.
      const login = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (login?.error) {
        // Extremely unlikely, but fall back to the login page.
        window.location.assign(`/${locale}/login`);
        return;
      }
      window.location.assign(`/${locale}/dashboard`);
    } catch {
      setFormError(t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <Card shape="arch" className="p-6 pt-12 sm:p-8 sm:pt-14">
      <h1 className="text-center font-display text-2xl font-bold text-samarkand-950">
        {t("registerTitle")}
      </h1>
      <p className="mt-1 text-center text-sm text-sand-800">{t("registerSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
        {formError && <Alert kind="error">{formError}</Alert>}

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">
            {t("roleQuestion")}
          </legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RoleCard
              selected={role === "SENDER"}
              title={t("roleSenderTitle")}
              body={t("roleSenderBody")}
              onSelect={() => setRole("SENDER")}
            />
            <RoleCard
              selected={role === "RECEIVER"}
              title={t("roleReceiverTitle")}
              body={t("roleReceiverBody")}
              onSelect={() => setRole("RECEIVER")}
            />
          </div>
        </fieldset>

        <Input
          label={t("name")}
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
        <Input
          label={t("email")}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <div>
          <Input
            label={t("password")}
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

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">
            {t("householdQuestion")}
          </legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-3">
            <RoleCard
              selected={householdMode === "create"}
              title={t("householdCreateTitle")}
              body={t("householdCreateBody")}
              onSelect={() => setHouseholdMode("create")}
            />
            <RoleCard
              selected={householdMode === "join"}
              title={t("householdJoinTitle")}
              body={t("householdJoinBody")}
              onSelect={() => setHouseholdMode("join")}
            />
          </div>
          <div className="mt-3">
            {householdMode === "create" ? (
              <Input
                label={t("householdName")}
                name="householdName"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                error={fieldErrors.householdName}
                placeholder={t("householdNamePlaceholder")}
              />
            ) : (
              <Input
                label={t("inviteCode")}
                name="inviteCode"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                error={fieldErrors.inviteCode}
                hint={t("inviteCodeHint")}
                maxLength={8}
                className="font-mono"
              />
            )}
          </div>
        </fieldset>

        <Button type="submit" full loading={submitting}>
          {t("registerButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-sand-800">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-samarkand-700 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </Card>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { clsx } from "clsx";
import { completeOnboarding } from "@/app/actions/onboarding";
import { IwanArch } from "@/components/ornament/Suzani";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const STEPS = ["family", "rates", "budget", "trust"] as const;

function StepArt({ step }: { step: (typeof STEPS)[number] }) {
  const cls = "h-12 w-12 text-samarkand-600";
  switch (step) {
    case "family":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <circle cx="16.5" cy="9.5" r="2.5" />
          <path d="M3.5 19c.6-3 2.9-5 5.5-5s4.9 2 5.5 5M13.5 14.6c.9-.7 1.9-1.1 3-1.1 2.1 0 3.9 1.6 4.4 4" strokeLinecap="round" />
        </svg>
      );
    case "rates":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 17l5-5 4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 8h5v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "budget":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h4" strokeLinecap="round" />
        </svg>
      );
    case "trust":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function OnboardingCarousel({ name }: { name: string }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function finish() {
    setLeaving(true);
    await completeOnboarding();
    // Full navigation so the dashboard render sees the fresh flag.
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <Card shape="arch" className="w-full max-w-md p-6 pt-12 text-center sm:p-8 sm:pt-14">
      <IwanArch className="mx-auto w-40">
        <StepArt step={current} />
      </IwanArch>

      <h1 className="mt-6 font-display text-2xl font-bold text-samarkand-950">
        {step === 0 ? t("family.title", { name }) : t(`${current}.title`)}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-sand-800">
        {t(`${current}.body`)}
      </p>

      {/* Progress dots */}
      <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={clsx(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-6 bg-samarkand-700" : "w-2 bg-sand-300",
            )}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {t("progress", { current: step + 1, total: STEPS.length })}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        {!isLast ? (
          <>
            <Button variant="ghost" onClick={finish} disabled={leaving}>
              {t("skip")}
            </Button>
            <Button onClick={() => setStep((s) => s + 1)}>{t("next")}</Button>
          </>
        ) : (
          <Button onClick={finish} loading={leaving} full>
            {t("start")}
          </Button>
        )}
      </div>
    </Card>
  );
}

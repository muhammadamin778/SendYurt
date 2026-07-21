"use client";

import { clsx } from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";

/* --------------------------------------------------------------------- */
/* Icons (inline SVG — the reference uses the Material Symbols web font)  */
/* --------------------------------------------------------------------- */

function Icon({ d, className = "h-6 w-6", fill = false, strokeWidth = 1.7 }: { d: string; className?: string; fill?: boolean; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={strokeWidth} aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GLYPH = {
  home: "M4 21V10l8-6 8 6v11M9 21v-6h6v6",
  group: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11",
  card: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M7 15h4",
  trend: "M4 17l6-6 4 4 8-8M15 7h6v6",
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
};

/* --------------------------------------------------------------------- */
/* Confetti — lightweight CSS burst for the final step                   */
/* --------------------------------------------------------------------- */

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: Math.random() * 100,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 3,
        duration: Math.random() * 2 + 3,
        color: ["#006c49", "#735c00", "#81d8ad", "#fed65b"][i % 4],
        round: i % 2 === 0,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>{`@keyframes onbFall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(360deg);opacity:0}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}vw`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animation: `onbFall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Step artwork inside the arch                                          */
/* --------------------------------------------------------------------- */

function Arch({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-8 flex h-64 w-48 items-center justify-center overflow-hidden rounded-t-full border border-[#bec9c0]/40 bg-[#f3f4f5] shadow-inner">
      {children}
    </div>
  );
}

function StepArt({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <Arch>
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#81d8ad]/25 text-[#005136]">
            <Icon d={GLYPH.group} className="h-10 w-10" />
          </div>
        </Arch>
      );
    case 1:
      return (
        <Arch>
          <div className="relative flex items-center justify-center">
            <div className="absolute h-32 w-32 animate-[spin_20s_linear_infinite] rounded-full border-2 border-dashed border-[#005136]/15" />
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-[#005136] shadow-sm">
              <Icon d={GLYPH.card} className="h-9 w-9" />
            </div>
          </div>
        </Arch>
      );
    case 2:
      return (
        <Arch>
          <div className="flex flex-col items-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full border border-[#bec9c0]/40 bg-[#e1e3e4] text-[#005136]">
              <Icon d={GLYPH.trend} className="h-9 w-9" />
            </div>
            <div className="flex items-end gap-1 opacity-50">
              <span className="h-4 w-1 animate-pulse rounded-full bg-[#005136]" />
              <span className="h-6 w-1 animate-pulse rounded-full bg-[#005136]" style={{ animationDelay: "0.2s" }} />
              <span className="h-3 w-1 animate-pulse rounded-full bg-[#005136]" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        </Arch>
      );
    default:
      return (
        <Arch>
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#81d8ad]/25 text-[#005136]">
            <Icon d={GLYPH.home} className="h-12 w-12" fill />
          </div>
        </Arch>
      );
  }
}

/* Desktop-only decorative tiles that frame the first step (branded
   placeholders — the reference used external stock photos). */
function FloatingTiles() {
  const tile = "overflow-hidden rounded-xl border border-[#bec9c0] bg-[#f3f4f5] shadow-sm";
  return (
    <div aria-hidden="true" className="pointer-events-none hidden xl:block">
      <div className="fixed left-12 top-1/2 flex -translate-y-1/2 flex-col gap-6">
        <div className={clsx(tile, "h-64 w-48 rotate-[-2deg]")}>
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#e7e8e9] to-[#f8f9fa] text-[#6f7a72]">
            <Icon d="M3 5h18v11H3zM8 20h8M12 16v4" className="h-10 w-10" />
          </div>
        </div>
        <div className={clsx(tile, "h-32 w-32 translate-x-12 rotate-[4deg]")}>
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#93eabe]/30 to-[#f8f9fa] text-[#005136]">
            <Icon d={GLYPH.group} className="h-8 w-8" />
          </div>
        </div>
      </div>
      <div className="fixed right-12 top-1/2 flex -translate-y-1/2 flex-col gap-6">
        <div className={clsx(tile, "h-40 w-40 rotate-[3deg]")}>
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2e3132] to-[#191c1d] text-[#81d8ad]">
            <Icon d={GLYPH.card} className="h-9 w-9" />
          </div>
        </div>
        <div className={clsx(tile, "h-72 w-56 -translate-x-12 rotate-[-5deg]")}>
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#191c1d] to-[#00352a] text-[#4edea3]">
            <Icon d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" className="h-12 w-12" strokeWidth={1.3} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Carousel                                                              */
/* --------------------------------------------------------------------- */

const TOTAL = 4;

export function OnboardingCarousel({ name }: { name: string }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  async function finish(path: "/dashboard" | "/profile") {
    if (leaving) return;
    setLeaving(true);
    await completeOnboarding();
    // Full navigation so the destination render sees the fresh flag.
    window.location.assign(`/${locale}${path}`);
  }

  const dots = (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "h-1.5 rounded-full transition-all duration-300",
            i === step ? "w-8 bg-[#005136] shadow-[0_0_8px_rgba(0,108,73,0.3)]" : "w-1.5 bg-[#bec9c0]",
          )}
        />
      ))}
    </div>
  );

  const primaryBtn = "w-full rounded-lg bg-[#005136] px-6 py-3.5 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#006c49] active:scale-95 disabled:opacity-60";
  const ghostLink = "text-[13px] font-semibold text-[#005136] transition-colors hover:underline disabled:opacity-60";
  const mutedLink = "text-[13px] font-semibold text-[#3f4943] transition-colors hover:text-[#191c1d] disabled:opacity-60";

  return (
    <>
      {step === 3 && <Confetti />}
      {step === 0 && <FloatingTiles />}

      {/* Brand */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#005136] text-white shadow-lg shadow-[#005136]/20">
          <Icon d={GLYPH.home} className="h-6 w-6" fill />
        </span>
        <span className="text-[20px] font-bold tracking-tight text-[#005136]">sendyurt</span>
      </div>

      {/* Card */}
      <div className="relative z-0 flex w-full max-w-lg flex-col items-center rounded-[1.75rem] border border-[#bec9c0]/60 bg-white p-8 text-center shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] md:p-12">
        <StepArt step={step} />

        <h1 className="text-[26px] font-bold leading-tight text-[#191c1d]">
          {step === 0 ? t("family.title", { name }) : step === 1 ? t("budget.title") : step === 2 ? t("rates.title") : t("finish.title")}
        </h1>
        {step === 1 && <h2 className="mt-2 text-[15px] font-medium tracking-wide text-[#005136]/80">{t("budget.subtitle")}</h2>}

        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-[#3f4943]">
          {step === 0 ? t("family.body") : step === 1 ? t("budget.body") : step === 2 ? t("rates.body") : t("finish.body")}
        </p>

        <div className="my-8">{dots}</div>
        <p className="sr-only" aria-live="polite">{t("progress", { current: step + 1, total: TOTAL })}</p>

        {/* Actions */}
        <div className="w-full">
          {step === 0 && (
            <div className="flex flex-col items-center gap-4">
              <button type="button" className={primaryBtn} onClick={() => setStep(1)}>{t("next")}</button>
              <button type="button" className={ghostLink} onClick={() => finish("/dashboard")} disabled={leaving}>{t("skip")}</button>
            </div>
          )}

          {step === 1 && (
            <div className="flex items-center justify-between">
              <button type="button" className={clsx(mutedLink, "flex items-center gap-1")} onClick={() => setStep(0)}>
                <Icon d={GLYPH.arrowLeft} className="h-4 w-4" /> {t("back")}
              </button>
              <div className="flex items-center gap-4">
                <button type="button" className={mutedLink} onClick={() => finish("/dashboard")} disabled={leaving}>{t("skip")}</button>
                <button type="button" className="flex items-center gap-2 rounded-lg bg-[#005136] px-6 py-2.5 text-[14px] font-semibold text-white shadow-md transition-all hover:bg-[#006c49] active:scale-95" onClick={() => setStep(2)}>
                  {t("next")} <Icon d={GLYPH.arrowRight} className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <button type="button" className={clsx(primaryBtn, "flex items-center justify-center gap-2")} onClick={() => setStep(3)}>
                {t("continue")} <Icon d={GLYPH.arrowRight} className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-between px-1">
                <button type="button" className={clsx(mutedLink, "flex items-center gap-1")} onClick={() => setStep(1)}>
                  <Icon d={GLYPH.arrowLeft} className="h-4 w-4" /> {t("back")}
                </button>
                <button type="button" className={mutedLink} onClick={() => finish("/dashboard")} disabled={leaving}>{t("skip")}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-4">
              <button type="button" className={clsx(primaryBtn, "flex items-center justify-center gap-2")} onClick={() => finish("/dashboard")} disabled={leaving}>
                {t("goDashboard")} <Icon d={GLYPH.arrowRight} className="h-5 w-5" />
              </button>
              <button type="button" className={ghostLink} onClick={() => finish("/profile")} disabled={leaving}>{t("reviewSettings")}</button>
            </div>
          )}
        </div>
      </div>

      {/* Per-step trust footer (decorative, matches the reference) */}
      <div className="mt-8 h-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f7a72]/70">
        {step === 1 && (
          <span className="flex items-center gap-2"><Icon d={GLYPH.shield} className="h-3.5 w-3.5" /> Secure Enterprise Infrastructure</span>
        )}
        {step === 2 && (
          <span className="flex items-center gap-2"><Icon d={GLYPH.shield} className="h-3.5 w-3.5" /> Secure Transactions · v4.2.1-Release</span>
        )}
        {step === 3 && <span>Step 4 of 4: Finalizing Setup</span>}
      </div>
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "@/components/ui/toast";
import { saveStripeCard } from "@/app/actions/cards";
import { getStripePromise, isStripeClientConfigured } from "@/lib/stripe-client";

/**
 * "Add new card" trigger + modal. Card capture is handled by **Stripe
 * Elements**: the real card number/expiry/CVC live inside Stripe-hosted
 * iframes and are tokenized into a PaymentMethod — they never touch our
 * inputs, our server, or our database (PCI-safe). We persist only Stripe's
 * references + the masked details (see the `saveStripeCard` action). A card
 * saved here is charged for real on send (test cards in sandbox).
 */

const COUNTRY_ISO: Record<string, string> = { uz: "UZ", us: "US", uk: "GB", de: "DE", kz: "KZ" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="px-1 text-[13px] font-medium text-[#45464d]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#cfc4c5] bg-[#f7f9fb] px-4 py-3 text-[15px] text-[#0f172a] outline-none transition-all placeholder:text-[#94a3b8] focus:border-[#0a7c53] focus:bg-white focus:ring-2 focus:ring-[#0a7c53]/15";

export function AddCardButton({ className }: { className?: string }) {
  const t = useTranslations("cards");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function closeSuccess() {
    setSuccess(false);
    router.push("/dashboard");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-xl border border-[#0a7c53] px-4 py-2.5 text-sm font-semibold text-[#0a7c53] transition-all hover:bg-[#0a7c53]/[0.06] active:scale-95"
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h3" strokeLinecap="round" /><path d="M18 13v4M16 15h4" strokeLinecap="round" />
        </svg>
        {t("addNew")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f172a]/25 backdrop-blur-sm md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-[640px] md:rounded-[28px]"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#9df4c8] opacity-20 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-start justify-between px-6 pb-4 pt-7 sm:px-8">
              <div>
                <h2 className="text-[24px] font-bold text-[#0f172a]">{t("title")}</h2>
                <p className="mt-1 text-[15px] text-[#64748b]">{t("subtitle")}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("cancel")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            {isStripeClientConfigured() ? (
              <Elements stripe={getStripePromise()}>
                <StripeCardFields
                  onCancel={() => setOpen(false)}
                  onSuccess={() => {
                    setOpen(false);
                    router.refresh();
                    setSuccess(true);
                  }}
                />
              </Elements>
            ) : (
              <p className="px-6 pb-8 text-[14px] text-[#b91c1c] sm:px-8">
                Stripe isn’t configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to add a card.
              </p>
            )}
          </div>
        </div>
      )}

      {success && <CardSuccess onDone={closeSuccess} />}
    </>
  );
}

/* ── Stripe-powered card form (rendered inside <Elements>) ───────────────── */
function StripeCardFields({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const t = useTranslations("cards");
  const stripe = useStripe();
  const elements = useElements();

  const [holder, setHolder] = useState("");
  const [household, setHousehold] = useState("main");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("uz");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Fetch a SetupIntent so we can save the card without charging it.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        setClientSecret(json.clientSecret ?? null);
        if (!json.clientSecret) setCardError(t("errorSave"));
      } catch {
        if (active) setCardError(t("errorSave"));
      } finally {
        if (active) setLoadingSecret(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (holder.trim().length < 2) {
      toast(t("errorFields"), "error");
      return;
    }
    const card = elements?.getElement(CardElement);
    if (!stripe || !elements || !card || !clientSecret) {
      toast(t("errorSave"), "error");
      return;
    }

    setBusy(true);
    setCardError(null);
    const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: holder.trim(),
          address: {
            postal_code: postal || undefined,
            city: city || undefined,
            country: COUNTRY_ISO[country] ?? undefined,
          },
        },
      },
    });

    if (error) {
      setBusy(false);
      setCardError(error.message ?? t("errorSave"));
      return;
    }

    const pmId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;
    if (!pmId) {
      setBusy(false);
      toast(t("errorSave"), "error");
      return;
    }

    const result = await saveStripeCard({ paymentMethodId: pmId, holderName: holder.trim() });
    setBusy(false);
    if (!result.ok) {
      toast(t("errorSave"), "error");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit} className="relative grid grid-cols-1 gap-5 overflow-y-auto px-6 pb-8 sm:grid-cols-2 sm:px-8">
      {/* Cardholder */}
      <div className="sm:col-span-2">
        <Field label={t("cardholderName")}>
          <input type="text" autoComplete="cc-name" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={t("cardholderPlaceholder")} className={inputCls} />
        </Field>
      </div>

      {/* Stripe CardElement (number + expiry + CVC in one secure field) */}
      <div className="sm:col-span-2">
        <Field label={t("cardNumber")}>
          <div className={clsx(inputCls, "py-3.5")}>
            {loadingSecret ? (
              <span className="text-[14px] text-[#94a3b8]">…</span>
            ) : (
              <CardElement
                options={{
                  hidePostalCode: true,
                  style: {
                    base: { fontSize: "15px", color: "#0f172a", "::placeholder": { color: "#94a3b8" } },
                    invalid: { color: "#b91c1c" },
                  },
                }}
                onChange={(ev) => setCardError(ev.error?.message ?? null)}
              />
            )}
          </div>
        </Field>
        {cardError && <p className="mt-1.5 px-1 text-[12px] font-medium text-[#b91c1c]">{cardError}</p>}
      </div>

      {/* Household + Postal */}
      <Field label={t("household")}>
        <select value={household} onChange={(e) => setHousehold(e.target.value)} className={clsx(inputCls, "cursor-pointer appearance-none")}>
          <option value="main">{t("hhMain")}</option>
          <option value="family">{t("hhFamily")}</option>
          <option value="office">{t("hhOffice")}</option>
          <option value="other">{t("hhOther")}</option>
        </select>
      </Field>
      <Field label={t("postalCode")}>
        <input type="text" inputMode="numeric" autoComplete="postal-code" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="100000" className={clsx(inputCls, "font-mono")} />
      </Field>

      {/* Town + Country */}
      <Field label={t("townCity")}>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tashkent" className={inputCls} />
      </Field>
      <Field label={t("country")}>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={clsx(inputCls, "cursor-pointer appearance-none")}>
          <option value="uz">{t("cUzbekistan")}</option>
          <option value="us">{t("cUS")}</option>
          <option value="uk">{t("cUK")}</option>
          <option value="de">{t("cGermany")}</option>
          <option value="kz">{t("cKazakhstan")}</option>
        </select>
      </Field>

      {/* Submit */}
      <div className="sm:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={busy || loadingSecret || !stripe}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-4 text-[16px] font-semibold text-white shadow-lg shadow-[#0a7c53]/20 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M17 15h3M18.5 13.5v3" strokeLinecap="round" /></svg>
                {t("submit")}
              </>
            )}
          </button>
          <button type="button" onClick={onCancel} className="w-full rounded-xl border border-[#cfc4c5] py-4 text-[16px] font-semibold text-[#45464d] transition-colors hover:bg-[#f1f5f9] sm:w-auto sm:px-8">
            {t("cancel")}
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-[#64748b]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" /></svg>
          {t("sslNote")}
        </p>
        <p className="mt-1 text-center text-[12px] text-[#94a3b8]">{t("demoNote")}</p>
      </div>
    </form>
  );
}

/* ── Success celebration screen ─────────────────────────────────────────
 * Full-screen confirmation shown after a card is added. Self-contained canvas
 * confetti in the brand palette — no external scripts. */
function CardSuccess({ onDone }: { onDone: () => void }) {
  const t = useTranslations("cards");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const cv = canvasEl;
    const cx = context;
    const dpr = window.devicePixelRatio || 1;
    const colors = ["#0a7c53", "#4edea3", "#d9a441", "#ffffff"];

    function size() {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    }
    size();
    window.addEventListener("resize", size);

    const parts = Array.from({ length: 90 }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * -cv.height,
      r: (Math.random() * 4 + 2) * dpr,
      vy: (Math.random() * 1.6 + 0.8) * dpr,
      vx: (Math.random() - 0.5) * 0.8 * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.1,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf = 0;
    function frame() {
      cx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;
        if (p.y > cv.height + 20) {
          p.y = -20;
          p.x = Math.random() * cv.width;
        }
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.rot);
        cx.globalAlpha = 0.85;
        cx.fillStyle = p.c;
        cx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        cx.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f7f9fb]" role="dialog" aria-modal="true" aria-label={t("successTitle")}>
      <main className="relative flex flex-grow items-center justify-center overflow-hidden p-4">
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" aria-hidden="true" />
        <div aria-hidden="true" className="pointer-events-none absolute left-10 top-1/4 h-4 w-4 animate-pulse rounded-full bg-[#9df4c8] opacity-40 blur-sm" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-1/4 right-12 h-6 w-6 animate-pulse rounded-full bg-[#6cf8bb] opacity-40 blur-md" />

        <div className="relative z-10 flex w-full max-w-[500px] flex-col items-center text-center">
          <div className="animate-card-float mb-2 flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/card-success.jpg" alt="" className="h-full w-full object-contain drop-shadow-2xl" />
          </div>

          <div className="w-full rounded-[32px] border border-[#cfc4c5] bg-white/80 p-8 shadow-xl backdrop-blur-md md:p-12">
            <h1 className="mb-2 text-[40px] font-bold leading-tight text-[#0f172a]">{t("successTitle")}</h1>
            <p className="mx-auto mb-6 max-w-[320px] text-[18px] leading-relaxed text-[#64748b]">{t("successBody")}</p>
            <button
              type="button"
              onClick={onDone}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] px-6 py-4 text-[16px] font-semibold text-white shadow-sm transition-all hover:bg-[#065f3e] active:scale-[0.98]"
            >
              {t("backToDashboard")}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <button type="button" onClick={onDone} className="mt-3 text-[14px] font-medium text-[#64748b] transition-colors hover:text-[#0a7c53]">
            {t("viewWallet")}
          </button>
        </div>
      </main>

      <footer className="flex w-full flex-col items-center justify-between gap-4 bg-[#1b1b1b] px-4 py-6 md:flex-row md:px-8">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <span className="text-[24px] font-black text-[#9df4c8]">SendYurt</span>
          <p className="text-[13px] text-[#848484]">{t("footerRights")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-[13px] text-[#848484]">
          <span>{t("ftTerms")}</span>
          <span>{t("ftPrivacy")}</span>
          <span>{t("ftSecurity")}</span>
          <span>{t("ftSupport")}</span>
        </div>
      </footer>
    </div>
  );
}

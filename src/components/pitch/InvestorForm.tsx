"use client";

import { useState, type FormEvent } from "react";
import type { PitchContent } from "@/app/pitch/content";

type Status = "idle" | "sending" | "done" | "error";

const fieldClass =
  "w-full rounded-xl border border-[#0B1A30]/14 bg-[#FBF6F0] px-4 py-2.5 text-[14px] text-[#0B1A30] placeholder:text-[#8A94A6] transition-colors focus:border-[#FF4F3D] focus:outline-none focus:ring-2 focus:ring-[#FF4F3D]/30";

const labelClass = "block text-[13px] font-semibold text-[#0B1A30]";

/**
 * A real, working investor / pilot inquiry form — posts to /api/investor,
 * which persists the message. Copy comes from the pitch's language dictionary
 * so the form speaks the visitor's chosen language.
 */
export function InvestorForm({ t }: { t: PitchContent["form"] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", organization: "", message: "" });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) return setError(t.errName);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError(t.errEmail);
    if (form.message.trim().length < 10) return setError(t.errMessage);

    setStatus("sending");
    try {
      const res = await fetch("/api/investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kind: "INVESTOR" }),
      });
      if (res.status === 429) {
        setStatus("error");
        setError(t.errRate);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setError(t.errServer);
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError(t.errNetwork);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_48px_-24px_rgba(11,26,48,0.5)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#C8EFD8]">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0C6B49]" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="f-display mt-4 text-xl font-bold text-[#0B1A30]">{t.thankTitle}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5A6B82]">
          {t.thankBody} <span className="font-semibold text-[#0B1A30]">{form.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white p-6 shadow-[0_20px_48px_-24px_rgba(11,26,48,0.5)] sm:p-8" noValidate>
      <p className="chip" style={{ backgroundColor: "#FFE3DD", color: "#E23A29" }}>{t.chip}</p>
      <h3 className="f-display mt-3 text-xl font-bold text-[#0B1A30]">{t.heading}</h3>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-[#E23A29]/25 bg-[#FFE3DD] px-3.5 py-2.5 text-[13px] font-medium text-[#B4291B]">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inv-name" className={labelClass}>{t.name}</label>
          <input id="inv-name" name="name" autoComplete="name" required value={form.name} onChange={update("name")} className={`mt-1.5 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor="inv-email" className={labelClass}>{t.email}</label>
          <input id="inv-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} className={`mt-1.5 ${fieldClass}`} />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="inv-org" className={labelClass}>
          {t.org} <span className="font-normal text-[#8A94A6]">{t.orgOptional}</span>
        </label>
        <input id="inv-org" name="organization" autoComplete="organization" value={form.organization} onChange={update("organization")} className={`mt-1.5 ${fieldClass}`} />
      </div>
      <div className="mt-4">
        <label htmlFor="inv-msg" className={labelClass}>{t.message}</label>
        <textarea id="inv-msg" name="message" rows={4} required value={form.message} onChange={update("message")} className={`mt-1.5 resize-none ${fieldClass}`} placeholder={t.messagePlaceholder} />
      </div>

      <button type="submit" disabled={status === "sending"} className="btn btn-coral mt-5 w-full px-6 py-3 text-[15px] disabled:opacity-60 sm:w-auto">
        {status === "sending" ? t.sending : t.send}
      </button>
      <p className="mt-4 text-[12.5px] leading-relaxed text-[#8A94A6]">
        {t.preferEmail}{" "}
        <a href="mailto:invest@sendyurt.uz" className="font-semibold text-[#E23A29] underline">invest@sendyurt.uz</a>.
      </p>
    </form>
  );
}

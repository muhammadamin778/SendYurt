"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "done" | "error";

const fieldClass =
  "w-full rounded-lg border border-[#F4EFE4]/12 bg-[#0B1220] px-4 py-2.5 text-[14px] text-[#F4EFE4] placeholder:text-[#5D6B84] transition-colors focus:border-[#2DD4BF]/50 focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/40";

const labelClass =
  "f-mono block text-[10px] uppercase tracking-[0.2em] text-[#8593AB]";

/**
 * A real, working investor / pilot inquiry form — posts to /api/investor,
 * which persists the message. Replaces the old mailto: link that appeared
 * to do nothing on devices with no mail client configured.
 */
export function InvestorForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    message: "",
  });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setError("Please enter a valid email address.");
    if (form.message.trim().length < 10)
      return setError("Please add a line or two about what you're looking for.");

    setStatus("sending");
    try {
      const res = await fetch("/api/investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kind: "INVESTOR" }),
      });
      if (res.status === 429) {
        setStatus("error");
        setError("Too many submissions — please try again a little later.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setError("Something went wrong on our side. Please try again.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Couldn't reach the server. Please check your connection and retry.");
    }
  }

  if (status === "done") {
    return (
      <div className="hairline rounded-2xl border bg-[#0E1729] p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#2DD4BF]/30 bg-[#2DD4BF]/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2DD4BF]" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="f-serif mt-4 text-xl font-medium text-[#F4EFE4]">
          Thank you — we&apos;ll be in touch.
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8593AB]">
          Your note reached the SendYurt team. Expect a reply at{" "}
          <span className="text-[#C6CFDE]">{form.email}</span> within a few working days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="hairline rounded-2xl border bg-[#0E1729] p-6 sm:p-8"
      noValidate
    >
      <p className="f-mono text-[11px] uppercase tracking-[0.2em] text-[#2DD4BF]">
        Investor inquiry
      </p>
      <h3 className="f-serif mt-2 text-xl font-medium text-[#F4EFE4]">
        Talk to the founders
      </h3>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-[#E8A33D]/30 bg-[#E8A33D]/[0.08] px-3.5 py-2.5 text-[13px] text-[#F0C078]">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inv-name" className={labelClass}>Name</label>
          <input id="inv-name" name="name" autoComplete="name" required value={form.name} onChange={update("name")} className={`mt-1.5 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor="inv-email" className={labelClass}>Email</label>
          <input id="inv-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} className={`mt-1.5 ${fieldClass}`} />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="inv-org" className={labelClass}>
          Fund / firm <span className="text-[#5D6B84]">(optional)</span>
        </label>
        <input id="inv-org" name="organization" autoComplete="organization" value={form.organization} onChange={update("organization")} className={`mt-1.5 ${fieldClass}`} />
      </div>
      <div className="mt-4">
        <label htmlFor="inv-msg" className={labelClass}>What are you looking for?</label>
        <textarea id="inv-msg" name="message" rows={4} required value={form.message} onChange={update("message")} className={`mt-1.5 resize-none ${fieldClass}`} placeholder="Stage, check size, what you'd like to see from us…" />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 w-full rounded-full bg-[#E8A33D] px-6 py-3 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#F0B458] disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
      <p className="mt-4 text-[12px] leading-relaxed text-[#5D6B84]">
        Prefer email? Reach us directly at{" "}
        <a href="mailto:invest@sendyurt.uz" className="text-[#8593AB] underline transition-colors hover:text-[#C6CFDE]">
          invest@sendyurt.uz
        </a>
        .
      </p>
    </form>
  );
}

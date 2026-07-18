"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRIES, flagEmoji } from "@/lib/country-codes";
import { formatMoney } from "@/lib/format";
import { GradientIcon } from "@/components/vision/ui";

type Tab = "utility" | "phone";

const UTILITIES: { key: string; icon: string; grad: "info" | "gold" | "success" | "brand" }[] = [
  { key: "electricity", icon: "M13 2L3 14h7l-1 8 10-12h-7z", grad: "gold" },
  { key: "gas", icon: "M12 2s5 4 5 9a5 5 0 01-10 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3 1-5 1-7z", grad: "brand" },
  { key: "water", icon: "M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z", grad: "info" },
  { key: "internet", icon: "M5 13a10 10 0 0114 0M8.5 16.5a5 5 0 017 0M12 20h.01", grad: "success" },
];

function fieldCls() {
  return "w-full rounded-xl border border-white/14 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-[#7c88a0] focus:border-[#21d4fd] focus:outline-none focus:ring-2 focus:ring-[#21d4fd]/30";
}

export function QuickPay() {
  const t = useTranslations("quickpay");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("utility");

  // Utility state
  const [utility, setUtility] = useState("electricity");
  const [account, setAccount] = useState("");
  // Phone state
  const [iso, setIso] = useState("UZ");
  const [phone, setPhone] = useState("");
  // Shared
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState<{ label: string; target: string; amount: number } | null>(null);

  const country = useMemo(() => COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0], [iso]);

  function pay(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (tab === "utility") {
      if (account.trim().length < 3) return;
      setDone({ label: t(`utilities.${utility}`), target: account.trim(), amount: amt });
      setAccount("");
    } else {
      if (phone.trim().length < 4) return;
      setDone({ label: t("phoneTopup"), target: `${country.dial} ${phone.trim()}`, amount: amt });
      setPhone("");
    }
    setAmount("");
  }

  if (done) {
    return (
      <div className="vision-card p-6 text-center">
        <div className="vision-grad-success mx-auto grid h-12 w-12 place-items-center rounded-2xl">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-white">{t("paidTitle")}</h3>
        <p className="mt-1 text-sm text-[#a0aec0]">
          {done.label} · <span className="font-mono text-white">{done.target}</span>
        </p>
        <p className="mt-1 font-display text-xl font-bold tabular-nums text-[#01e17b]">
          {formatMoney(done.amount, "UZS", locale)}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-[#7c88a0]">{t("demoTag")}</p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-4 rounded-lg border border-white/14 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          {t("payAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="vision-card p-6">
      <div className="flex items-center gap-2.5">
        <GradientIcon grad="info" path="M3 10h18M7 15h4M5 6h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" size="sm" />
        <h2 className="font-display text-lg font-bold text-white">{t("title")}</h2>
      </div>

      {/* Tabs */}
      <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
        {(["utility", "phone"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === k ? "vision-grad-info text-white" : "text-[#a0aec0] hover:text-white"
            }`}
          >
            {t(k === "utility" ? "utilityTab" : "phoneTab")}
          </button>
        ))}
      </div>

      <form onSubmit={pay} className="mt-5 space-y-4" noValidate>
        {tab === "utility" ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {UTILITIES.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => setUtility(u.key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                    utility === u.key
                      ? "border-[#21d4fd]/50 bg-[#21d4fd]/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <GradientIcon grad={u.grad} path={u.icon} size="sm" />
                  <span className="text-xs font-semibold text-white">{t(`utilities.${u.key}`)}</span>
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="qp-account" className="block text-xs font-semibold text-[#cbd5e1]">
                {t("accountLabel")}
              </label>
              <input
                id="qp-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                inputMode="numeric"
                placeholder={t("accountPlaceholder")}
                className={`mt-1.5 ${fieldCls()}`}
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="qp-phone" className="block text-xs font-semibold text-[#cbd5e1]">
              {t("phoneLabel")}
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative">
                <select
                  aria-label={t("countryLabel")}
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                  className="h-full appearance-none rounded-xl border border-white/14 bg-white/5 py-2.5 pl-10 pr-7 text-sm font-semibold text-white focus:border-[#21d4fd] focus:outline-none focus:ring-2 focus:ring-[#21d4fd]/30"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.iso + c.dial} value={c.iso}>
                      {flagEmoji(c.iso)} {c.dial} · {c.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg leading-none" aria-hidden="true">
                  {flagEmoji(country.iso)}
                </span>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7c88a0]" aria-hidden="true">▾</span>
              </div>
              <input
                id="qp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder={t("phonePlaceholder")}
                className={fieldCls()}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#7c88a0]">
              {country.dial} {phone || t("phonePlaceholder")}
            </p>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="qp-amount" className="block text-xs font-semibold text-[#cbd5e1]">
              {t("amountLabel")}
            </label>
            <input
              id="qp-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="50 000"
              className={`mt-1.5 ${fieldCls()}`}
            />
          </div>
          <button
            type="submit"
            className="vision-grad-info rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("pay")}
          </button>
        </div>
      </form>
      <p className="mt-3 text-[11px] uppercase tracking-wide text-[#7c88a0]">{t("demoTag")}</p>
    </div>
  );
}

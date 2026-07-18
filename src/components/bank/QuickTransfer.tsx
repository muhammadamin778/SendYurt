"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export interface TransferMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

export function QuickTransfer({ members }: { members: TransferMember[] }) {
  const t = useTranslations("bank");
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [active, setActive] = useState(members[0]?.id ?? null);

  function start() {
    const a = amount.trim();
    router.push(a ? `/rates?amount=${encodeURIComponent(a)}` : "/rates");
  }

  return (
    <div className="flex h-full flex-col justify-center">
      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#64748b]">{t("noRecipients")}</p>
      ) : (
        <div className="flex items-center gap-5 overflow-x-auto pb-2">
          {members.slice(0, 4).map((m) => {
            const isActive = m.id === active;
            const initial = m.name.trim().charAt(0).toUpperCase();
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(m.id)}
                className="flex shrink-0 flex-col items-center gap-2"
              >
                <span
                  className={`grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#0a7c53] to-[#34d399] font-sans text-lg font-bold text-white ${isActive ? "ring-2 ring-[#0a7c53] ring-offset-2" : ""}`}
                >
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
                <span className={`max-w-[70px] truncate text-[13px] ${isActive ? "font-bold text-[#0f172a]" : "text-[#64748b]"}`}>
                  {m.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-center gap-4">
        <span className="text-[15px] text-[#64748b]">{t("writeAmount")}</span>
        <div className="flex flex-1 items-center rounded-full bg-[#eef2f7] pl-5 pr-1">
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="525.50"
            className="w-full bg-transparent py-3 text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none"
          />
          <button
            type="button"
            onClick={start}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#065f3e] px-5 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("send")}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M3 3l18 9-18 9 4-9-4-9z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

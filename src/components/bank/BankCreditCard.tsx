import { clsx } from "clsx";

/**
 * BankDash-style account card. Presentational only — the figures passed in
 * are real SendYurt household values (savings, monthly totals, invite code).
 */
export function BankCreditCard({
  variant = "filled",
  balanceLabel,
  balance,
  holderLabel,
  holder,
  validLabel,
  valid,
  number,
}: {
  variant?: "filled" | "light";
  balanceLabel: string;
  balance: string;
  holderLabel: string;
  holder: string;
  validLabel: string;
  valid: string;
  number: string;
}) {
  const filled = variant === "filled";

  return (
    <div
      className={clsx(
        "relative flex aspect-[1.9/1] w-full flex-col justify-between overflow-hidden rounded-[25px]",
        filled
          ? "bg-gradient-to-br from-[#1f2a44] to-[#0b1220] text-white"
          : "border border-[#e2e8f0] bg-white text-[#0f172a]",
      )}
    >
      <div className="flex items-start justify-between px-6 pt-5">
        <div>
          <p className={clsx("text-[12px]", filled ? "text-white/70" : "text-[#94a3b8]")}>{balanceLabel}</p>
          <p className="mt-1 text-[20px] font-bold tabular-nums leading-none sm:text-[22px]">{balance}</p>
        </div>
        {/* chip */}
        <svg viewBox="0 0 36 30" className="mt-1 h-7 w-8" aria-hidden="true">
          <rect x="1" y="1" width="34" height="28" rx="6" fill={filled ? "rgba(255,255,255,0.25)" : "#f1f5f9"} />
          <path d="M1 10h34M1 20h34M13 1v28M23 1v28" stroke={filled ? "rgba(255,255,255,0.5)" : "#cbd5e1"} strokeWidth="1.4" />
        </svg>
      </div>

      <div className="flex items-end justify-between gap-4 px-6">
        <div>
          <p className={clsx("text-[10px] uppercase tracking-wide", filled ? "text-white/60" : "text-[#94a3b8]")}>{holderLabel}</p>
          <p className="mt-0.5 truncate text-[14px] font-semibold">{holder}</p>
        </div>
        <div>
          <p className={clsx("text-[10px] uppercase tracking-wide", filled ? "text-white/60" : "text-[#94a3b8]")}>{validLabel}</p>
          <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{valid}</p>
        </div>
      </div>

      <div
        className={clsx(
          "mt-4 flex items-center justify-between px-6 py-4",
          filled ? "bg-white/10" : "border-t border-[#e2e8f0]",
        )}
      >
        <p className="font-mono text-[17px] font-semibold tracking-[0.12em] tabular-nums">{number}</p>
        <span className="relative flex items-center" aria-hidden="true">
          <span className={clsx("h-6 w-6 rounded-full", filled ? "bg-white/60" : "bg-[#94a3b8]/60")} />
          <span className={clsx("-ml-2.5 h-6 w-6 rounded-full", filled ? "bg-white/40" : "bg-[#94a3b8]/40")} />
        </span>
      </div>
    </div>
  );
}

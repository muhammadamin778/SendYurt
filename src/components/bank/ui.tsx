import { clsx } from "clsx";

/** Page container — consistent max width + vertical rhythm across all pages. */
export function BankPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("mx-auto max-w-[1180px] space-y-7", className)}>{children}</div>;
}

/** Big page heading (matches the topbar type scale). */
export function BankHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-bold text-[#0f172a]">{title}</h1>
      {sub && <p className="mt-1 text-[15px] text-[#64748b]">{sub}</p>}
    </div>
  );
}

/** A titled section wrapping a white card. */
export function BankCard({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-[18px] font-semibold text-[#0f172a]">{title}</h2>}
          {action}
        </div>
      )}
      <div className={clsx("bank-card", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Rounded icon chip used across the design. */
export function BankChip({ tone = "blue", icon }: { tone?: "blue" | "teal" | "gold" | "pink"; icon: string }) {
  const tones = {
    blue: "bg-[#dcfce7] text-[#0a7c53]",
    teal: "bg-[#d1fae5] text-[#059669]",
    gold: "bg-[#fff5d9] text-[#f5b544]",
    pink: "bg-[#fee2e2] text-[#ef4444]",
  } as const;
  return (
    <span className={clsx("grid h-14 w-14 shrink-0 place-items-center rounded-full", tones[tone])}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** KPI stat tile (icon + label + value). */
export function BankStat({
  label,
  value,
  sub,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "blue" | "teal" | "gold" | "pink";
  icon: string;
}) {
  return (
    <div className="bank-card flex items-center gap-4 px-5 py-4">
      <BankChip tone={tone} icon={icon} />
      <div className="min-w-0">
        <p className="truncate text-[13px] text-[#64748b]">{label}</p>
        <p className="mt-1 truncate text-[22px] font-bold tabular-nums text-[#0f172a]">{value}</p>
        {sub && <p className="truncate text-[12px] text-[#94a3b8]">{sub}</p>}
      </div>
    </div>
  );
}

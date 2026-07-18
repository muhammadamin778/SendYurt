import { clsx } from "clsx";

/**
 * Vision UI (Creative Tim) building blocks, adapted for SendYurt. Dark
 * navy-indigo glass world, blue→cyan gradient accents. Presentational only
 * (server-safe) — wrap with `Link` in pages where navigation is needed.
 */

/** The dark gradient canvas that hosts a page's glass cards. */
export function VisionPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("vision-panel rounded-3xl px-5 py-8 sm:px-8", className)}>
      {children}
    </div>
  );
}

/** A glassmorphic card. */
export function VisionCard({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={clsx("vision-card", hover && "vision-card-hover", className)}>
      {children}
    </div>
  );
}

export type Grad = "info" | "brand" | "success" | "gold";
const GRAD: Record<Grad, string> = {
  info: "vision-grad-info",
  brand: "vision-grad-brand",
  success: "vision-grad-success",
  gold: "vision-grad-gold",
};

/** Gradient rounded icon box (SVG stroke path). */
export function GradientIcon({
  grad = "info",
  path,
  size = "md",
}: {
  grad?: Grad;
  path: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";
  const svg = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={clsx("grid shrink-0 place-items-center", box, GRAD[grad])}>
      <svg viewBox="0 0 24 24" className={clsx(svg, "text-white")} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** KPI "MiniStatistics" tile. */
export function VisionStat({
  label,
  value,
  delta,
  sub,
  grad = "info",
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: { pct: number } | null;
  sub?: React.ReactNode;
  grad?: Grad;
  icon: string;
}) {
  return (
    <VisionCard className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0aec0]">{label}</p>
        <p className="mt-1 font-display text-xl font-bold tabular-nums text-white">{value}</p>
        {delta ? (
          <p className="mt-0.5 text-xs font-semibold tabular-nums">
            <span className={delta.pct >= 0 ? "text-[#01e17b]" : "text-[#ff5b7f]"}>
              {delta.pct >= 0 ? "+" : ""}
              {delta.pct}%
            </span>{" "}
            <span className="font-normal text-[#a0aec0]">{sub}</span>
          </p>
        ) : (
          sub && <p className="mt-0.5 text-xs text-[#a0aec0]">{sub}</p>
        )}
      </div>
      <GradientIcon grad={grad} path={icon} />
    </VisionCard>
  );
}

/** Page/section title on the dark panel. */
export function VisionTitle({
  children,
  sub,
  as = "h1",
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  const Tag = as;
  return (
    <div>
      <Tag
        className={clsx(
          "font-display font-bold tracking-tight text-white",
          as === "h1" ? "text-2xl sm:text-3xl" : "text-lg",
        )}
      >
        {children}
      </Tag>
      {sub && <p className="mt-1 text-sm text-[#a0aec0]">{sub}</p>}
    </div>
  );
}

/** Small translucent chip. */
export function GlassChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-semibold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

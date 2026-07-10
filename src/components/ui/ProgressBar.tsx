import { clsx } from "clsx";

export function ProgressBar({
  value,
  max,
  label,
  danger,
  className,
}: {
  value: number;
  max: number;
  /** Accessible name for the bar. */
  label: string;
  /** Render in terracotta when the bar represents overspend. */
  danger?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={clsx("h-2.5 w-full overflow-hidden rounded-full bg-sand-200", className)}
    >
      <div
        className={clsx(
          "h-full rounded-full motion-safe:transition-all",
          danger || over ? "bg-terracotta-600" : "bg-samarkand-600",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

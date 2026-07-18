import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";

/**
 * shadcn/ui-style KPI tile: a muted label, a large tabular value, and an
 * optional hint or trailing element. Used for the money/score summaries.
 */
export function StatCard({
  label,
  value,
  hint,
  trailing,
  valueClassName,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={clsx("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {trailing}
      </div>
      <p
        className={clsx(
          "mt-2 font-display text-2xl font-bold tabular-nums text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

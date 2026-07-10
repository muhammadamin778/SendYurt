import { getLocale, getTranslations } from "next-intl/server";
import { formatMonth } from "@/lib/format";

export interface TimelineMonth {
  key: string; // "YYYY-MM"
  monthStartIso: string;
  amountUzs: number | null; // null = no remittance that month
  isCurrent: boolean;
}

function compact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(Math.round(amount));
}

/**
 * Twelve months of arrivals at a glance: filled lapis markers for months
 * money came home, hollow ones for gaps — the consistency factor made
 * visible.
 */
export async function RemittanceTimeline({ months }: { months: TimelineMonth[] }) {
  const t = await getTranslations("trust.timeline");
  const locale = await getLocale();

  return (
    <div>
      <ol className="grid grid-cols-6 gap-y-5 sm:grid-cols-12" aria-label={t("ariaLabel")}>
        {months.map((m) => {
          const arrived = m.amountUzs !== null;
          const label = formatMonth(new Date(m.monthStartIso), locale);
          return (
            <li key={m.key} className="flex flex-col items-center gap-1.5 text-center">
              <span
                title={
                  arrived
                    ? t("tooltipArrived", { month: label })
                    : t("tooltipMissed", { month: label })
                }
                className={
                  arrived
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-samarkand-700 dark:bg-samarkand-600"
                    : "flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-sand-300 dark:border-night-line"
                }
              >
                {arrived && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                className={
                  m.isCurrent
                    ? "text-[11px] font-bold capitalize text-samarkand-800 dark:text-samarkand-300"
                    : "text-[11px] capitalize text-sand-700 dark:text-night-soft"
                }
              >
                {label}
              </span>
              <span className="text-[10px] font-semibold text-sand-800 dark:text-night-soft">
                {arrived ? compact(m.amountUzs!) : "—"}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-sand-700 dark:text-night-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-samarkand-700" /> {t("legendArrived")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-dashed border-sand-400" /> {t("legendMissed")}
        </span>
      </div>
    </div>
  );
}

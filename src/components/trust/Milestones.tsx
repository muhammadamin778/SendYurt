import { getTranslations } from "next-intl/server";
import { clsx } from "clsx";
import type { Milestone } from "@/lib/milestones";

// Eight-point star medallion (the girih star, simplified) — gold when
// earned, faint outline when still ahead. No confetti, no counters:
// quiet pride.
function StarMedallion({ earned }: { earned: boolean }) {
  return (
    <span
      className={clsx(
        "flex h-12 w-12 items-center justify-center rounded-full border",
        earned
          ? "border-zar-300 bg-zar-50 dark:border-zar-700 dark:bg-zar-950"
          : "border-sand-200 bg-sand-100 dark:border-night-line dark:bg-night",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={clsx("h-6 w-6", earned ? "text-zar-600 dark:text-zar-400" : "text-sand-300 dark:text-night-line")}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l2.1 5.1L19 5l-2.1 5.1L22 12l-5.1 1.9L19 19l-4.9-2.1L12 22l-2.1-5.1L5 19l2.1-5.1L2 12l5.1-1.9L5 5l4.9 2.1Z" />
      </svg>
    </span>
  );
}

export async function Milestones({ milestones }: { milestones: Milestone[] }) {
  const t = await getTranslations("trust.milestones");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {milestones.map((m) => (
        <div
          key={m.id}
          className={clsx(
            "flex items-center gap-3 rounded-xl border p-3.5 lg:flex-col lg:items-center lg:gap-2 lg:p-4 lg:text-center",
            m.earned
              ? "border-zar-200 bg-white shadow-card dark:border-zar-800 dark:bg-night-raised"
              : "border-sand-200 bg-sand-50 opacity-70 dark:border-night-line dark:bg-night",
          )}
        >
          <StarMedallion earned={m.earned} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink dark:text-white">
              {t(`${m.id}.title`)}
            </h3>
            <p className="mt-0.5 text-xs leading-snug text-sand-700 dark:text-night-soft">
              {m.earned ? t(`${m.id}.earned`) : t(`${m.id}.locked`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

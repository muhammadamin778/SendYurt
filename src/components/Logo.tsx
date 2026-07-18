import { clsx } from "clsx";

/**
 * SendYurt mark: a yurt dome with a rising growth arrow, set on a base
 * platform — "sending value home, growing." Drawn in a single currentColor so
 * it recolors per context (terracotta on light, white on the navy app icon).
 */
export function YurtMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 50"
      aria-hidden="true"
      fill="none"
      className={clsx("h-7 w-auto", className)}
    >
      {/* base platform */}
      <rect
        x="7"
        y="35"
        width="40"
        height="6.5"
        rx="3.25"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      {/* yurt dome */}
      <path
        d="M12 33 C12 20 19 13 28 13 C35 13 40 17 42 23 C41 27 40 30 40 33 Z"
        fill="currentColor"
      />
      {/* rising growth arrow */}
      <path
        d="M31 20 C37 14 44 12 51 12 M45 8 L52 12 L48.5 18.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <YurtMark className="text-terracotta-600" />
      <span className="font-display text-xl font-semibold lowercase tracking-tight text-samarkand-900">
        sendyurt
      </span>
    </span>
  );
}

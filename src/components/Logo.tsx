import { clsx } from "clsx";

// Yurt mark: crown (tunduk), conical roof and round wall with a door —
// drawn as simple geometry so it stays crisp at 16px.
export function YurtMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={clsx("h-8 w-8", className)}
    >
      <circle cx="16" cy="4.5" r="2" className="fill-terracotta-500" />
      <path d="M16 7 29 18.5 H3 Z" className="fill-samarkand-600" />
      <path
        d="M5 20 h22 v6 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 Z"
        className="fill-samarkand-700"
      />
      <rect x="13.5" y="21.5" width="5" height="6.5" rx="1" className="fill-terracotta-400" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <YurtMark />
      <span className="font-display text-xl font-bold tracking-tight text-samarkand-900">
        Send<span className="text-terracotta-600">Yurt</span>
      </span>
    </span>
  );
}

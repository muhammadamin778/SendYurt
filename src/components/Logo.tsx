import { clsx } from "clsx";

/**
 * SendYurt brand mark — the navy yurt-with-star logo, self-hosted at
 * /logo.svg. It's a fixed-colour asset (not recolourable via currentColor),
 * so it's meant for light backgrounds. `object-contain` preserves its aspect
 * ratio inside whatever box the caller sizes.
 */
export function YurtMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="" aria-hidden="true" className={clsx("h-7 w-auto object-contain", className)} />
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

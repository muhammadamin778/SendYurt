// Suzani-inspired ornament: a small embroidered-vine divider — central
// rosette with mirrored vines and leaves. Drawn in currentColor so it
// takes the tone of its context. Decorative only (aria-hidden), used
// under page titles and in empty states — never over functional UI.
export function SuzaniDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 24"
      aria-hidden="true"
      className={className ?? "h-5 w-48 text-terracotta-400"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* central rosette */}
      <circle cx="110" cy="12" r="4" />
      <path d="M110 4.5v3M110 16.5v3M102.5 12h3M114.5 12h3M104.8 6.8l2.1 2.1M113.1 15.1l2.1 2.1M115.2 6.8l-2.1 2.1M106.9 15.1l-2.1 2.1" />
      {/* mirrored vines */}
      <path d="M98 12C86 12 84 5 72 5s-14 7-26 7-14-7-36-5" />
      <path d="M122 12c12 0 14-7 26-7s14 7 26 7 14-7 36-5" />
      {/* leaves */}
      <path d="M72 5c-2-3-6-4-9-3 1 3 5 5 9 3ZM148 5c2-3 6-4 9-3-1 3-5 5-9 3Z" />
      <circle cx="34" cy="9.5" r="2" />
      <circle cx="186" cy="9.5" r="2" />
    </svg>
  );
}

// Iwan portal arch: the pointed arch of madrasa entrances, used as a
// framing shape for empty states, onboarding art and the score dial.
export function IwanArch({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="relative mx-auto flex aspect-[4/5] w-full max-w-[180px] items-end justify-center overflow-hidden rounded-arch border border-sand-200 bg-gradient-to-b from-samarkand-50 to-sand-50 dark:border-night-line dark:from-night-raised dark:to-night">
        <div className="pb-5">{children}</div>
      </div>
    </div>
  );
}

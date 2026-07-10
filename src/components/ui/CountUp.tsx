"use client";

import { useEffect, useState } from "react";

/**
 * Counts from 0 to `value` with an ease-out curve. Renders the final
 * value immediately for users who prefer reduced motion (and on the
 * server, so there's no layout shift on hydration mismatch).
 */
export function CountUp({
  value,
  durationMs = 900,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // No ref guard here: strict mode mounts effects twice in dev, and a
    // one-shot guard would cancel the animation on the second pass.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let raf: number;
    const start = performance.now();
    setDisplay(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF doesn't fire in hidden tabs — guarantee the final value lands
    // even if the user switches away during the reveal.
    const finish = setTimeout(() => setDisplay(value), durationMs + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finish);
    };
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}

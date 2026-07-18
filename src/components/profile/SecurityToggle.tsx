"use client";

import { clsx } from "clsx";
import { useState } from "react";

/**
 * Visual security toggle. 2FA and privacy have no backend yet, so this flips
 * local state only — presentational, matching the settings design.
 */
export function SecurityToggle({ defaultOn = false, label }: { defaultOn?: boolean; label: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={clsx("relative h-6 w-12 shrink-0 rounded-full transition-colors", on ? "bg-[#0a7c53]" : "bg-[#e0e3e5]")}
    >
      <span className={clsx("absolute top-1 h-4 w-4 rounded-full bg-white transition-transform", on ? "translate-x-7" : "translate-x-1")} />
    </button>
  );
}

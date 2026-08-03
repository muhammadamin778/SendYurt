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
      // Geometry stated once: a 44x24 track with a 20px knob and 2px of
      // breathing room, so "on" travels exactly 44 - 20 - 2 - 2 = 20px. The
      // knob previously used an offset unrelated to the track width and sat
      // hard against the rounded edge, which read as a solid pill with
      // nothing in it.
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-[#0a7c53]" : "bg-[#cbd5e1]",
      )}
    >
      <span
        className={clsx(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

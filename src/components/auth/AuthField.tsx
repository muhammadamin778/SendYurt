"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

/**
 * Rounded input in the two-panel auth style: a label above a soft-filled box
 * with a leading icon, a trailing slot (password eye) and a green check when
 * valid. Explicit hex so the light design never inverts under dark mode.
 */
export const AuthField = forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    icon?: React.ReactNode;
    trailing?: React.ReactNode;
    valid?: boolean;
    error?: string;
    hint?: string;
  } & React.InputHTMLAttributes<HTMLInputElement>
>(function AuthField({ id, label, icon, trailing, valid, error, hint, className, ...props }, ref) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[#45464d]">
          {label}
        </label>
      )}
      <div
        className={clsx(
          "flex items-center gap-3 rounded-xl border bg-[#f2f4f6] px-3.5 py-3 transition-all focus-within:border-[#0a7c53] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0a7c53]/15",
          error ? "border-[#ef4444]" : "border-[#e2e8f0]",
        )}
      >
        {icon && <span className="shrink-0 text-[#64748b]">{icon}</span>}
        <input
          id={id}
          ref={ref}
          className={clsx(
            "min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium text-[#0f172a] outline-none placeholder:font-normal placeholder:text-[#94a3b8] focus:ring-0",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="shrink-0">{trailing}</span>
        ) : valid ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#16a34a]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-[#ef4444]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[#94a3b8]">{hint}</p>
      ) : null}
    </div>
  );
});

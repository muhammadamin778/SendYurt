"use client";

import { clsx } from "clsx";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id: idProp, children, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(
          "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-samarkand-500 focus:border-samarkand-500",
          error ? "border-terracotta-600" : "border-sand-300",
        )}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-terracotta-700">
          {error}
        </p>
      )}
    </div>
  );
});

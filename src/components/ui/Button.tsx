"use client";

import { clsx } from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-samarkand-700 text-white hover:bg-samarkand-800 focus-visible:outline-samarkand-700",
  secondary:
    "bg-white text-samarkand-800 border border-samarkand-300 hover:bg-samarkand-50 focus-visible:outline-samarkand-700",
  ghost:
    "bg-transparent text-samarkand-800 hover:bg-samarkand-50 focus-visible:outline-samarkand-700",
  danger:
    "bg-terracotta-700 text-white hover:bg-terracotta-800 focus-visible:outline-terracotta-700",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", loading, full, className, children, disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variants[variant],
          full && "w-full",
          className,
        )}
        {...rest}
      >
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </button>
    );
  },
);

import { clsx } from "clsx";

export function Card({
  className,
  children,
  accent,
  shape = "rect",
}: {
  className?: string;
  children: React.ReactNode;
  /** Adds a thin terracotta top border, used to highlight key cards. */
  accent?: boolean;
  /** "arch" tops the card with an iwan-portal curve (auth cards, modals). */
  shape?: "rect" | "arch";
}) {
  return (
    <div
      className={clsx(
        "bg-white shadow-card dark:bg-night-raised",
        shape === "arch" ? "rounded-arch" : "rounded-xl",
        accent && shape === "rect"
          ? "border-t-4 border-terracotta-500"
          : "border border-sand-200 dark:border-night-line",
        className,
      )}
    >
      {children}
    </div>
  );
}

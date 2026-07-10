import { clsx } from "clsx";

export function Card({
  className,
  children,
  accent,
}: {
  className?: string;
  children: React.ReactNode;
  /** Adds a thin terracotta top border, used to highlight key cards. */
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-white shadow-card",
        accent ? "border-t-4 border-terracotta-500" : "border border-sand-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

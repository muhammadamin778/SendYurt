import { clsx } from "clsx";

const styles = {
  error: "border-terracotta-300 bg-terracotta-50 text-terracotta-900",
  success: "border-samarkand-300 bg-samarkand-50 text-samarkand-900",
  info: "border-sand-300 bg-sand-100 text-sand-900",
} as const;

export function Alert({
  kind = "info",
  children,
  className,
}: {
  kind?: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={clsx("rounded-lg border px-4 py-3 text-sm", styles[kind], className)}
    >
      {children}
    </div>
  );
}

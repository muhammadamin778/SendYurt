import { clsx } from "clsx";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "muted"
  | "success"
  | "destructive"
  | "gold";

const VARIANTS: Record<Variant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  muted: "border-transparent bg-muted text-muted-foreground",
  success: "border-transparent bg-success/15 text-success",
  destructive: "border-transparent bg-destructive/12 text-destructive",
  gold: "border-transparent bg-zar-100 text-zar-800",
};

/**
 * shadcn/ui-style badge. Small rounded status pill; `success`/`destructive`
 * use soft tints (finance semantics) rather than solid fills.
 */
export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

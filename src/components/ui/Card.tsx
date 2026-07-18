import { clsx } from "clsx";

/**
 * shadcn/ui-style card, themed to SendYurt. `Card` is the surface; compose
 * `CardHeader` → `CardTitle`/`CardDescription`, `CardContent` and
 * `CardFooter` inside it. Colours come from the semantic token layer
 * (bg-card / border-border / text-card-foreground) so dark mode is automatic.
 */
export function Card({
  className,
  children,
  accent,
  shape = "rect",
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
  /** Adds a thin premium-gold top border, used to highlight key cards. */
  accent?: boolean;
  /** "arch" tops the card with an iwan-portal curve (auth cards, modals). */
  shape?: "rect" | "arch";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-card text-card-foreground shadow-sm",
        shape === "arch" ? "rounded-arch" : "rounded-xl",
        accent && shape === "rect"
          ? "border-x border-b border-t-2 border-border border-t-zar-500"
          : "border border-border",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5 px-6 pt-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={clsx(
        "font-display text-lg font-bold leading-tight tracking-tight text-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={clsx("text-sm leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx("px-6 pb-6 pt-5", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("flex items-center px-6 pb-6", className)}>{children}</div>
  );
}

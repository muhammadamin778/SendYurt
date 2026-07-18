import { clsx } from "clsx";

/** shadcn/ui-style skeleton placeholder. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-muted", className)} />;
}

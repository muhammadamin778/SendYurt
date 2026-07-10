import { IwanArch } from "@/components/ornament/Suzani";

/**
 * Empty state framed by an iwan arch — a doorway waiting to be filled,
 * rather than a blank gray void.
 */
export function EmptyState({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white p-8 text-center shadow-card dark:border-night-line dark:bg-night-raised">
      <IwanArch className="mb-4">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-samarkand-300" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 21V10l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </IwanArch>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-sand-800 dark:text-night-soft">
        {children}
      </p>
    </div>
  );
}

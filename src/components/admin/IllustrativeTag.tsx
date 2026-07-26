/**
 * Marks a panel whose figures are placeholder, not real data.
 *
 * Several admin widgets (the corridor map, network status, liquidity ratio,
 * system health, the reserve pool) have no data source behind them yet. They
 * are kept because the layout is the intended design, but a viewer must be
 * able to tell at a glance — so this sits ADJACENT to the figure, not buried
 * at the bottom of a scroll container where the earlier disclaimers were.
 *
 * If a widget ever gets a real source, delete the tag rather than leaving a
 * stale "illustrative" label on genuine data.
 */
export function IllustrativeTag({ className = "" }: { className?: string }) {
  return (
    <span
      title="Placeholder figures — no live data source is wired for this panel yet."
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-[#bec9c0] bg-[#edeeef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6f7a72] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16v.5" strokeLinecap="round" />
      </svg>
      Illustrative
    </span>
  );
}

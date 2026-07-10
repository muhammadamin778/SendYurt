export default function BudgetLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-sand-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-sand-200" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-sand-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-sand-200" />
        ))}
      </div>
    </div>
  );
}

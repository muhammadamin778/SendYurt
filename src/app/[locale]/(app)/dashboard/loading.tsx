export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-sand-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-sand-200" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-sand-200" />
    </div>
  );
}

export default function TrustLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-sand-200" />
      <div className="h-56 animate-pulse rounded-xl bg-sand-200" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-sand-200" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-sand-200" />
    </div>
  );
}

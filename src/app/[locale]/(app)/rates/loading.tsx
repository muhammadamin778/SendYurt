export default function RatesLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-sand-200" />
      <div className="h-12 animate-pulse rounded-lg bg-sand-200" />
      <div className="h-24 animate-pulse rounded-xl bg-sand-200" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-sand-200" />
      ))}
    </div>
  );
}

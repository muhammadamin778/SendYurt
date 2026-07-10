// Server-safe SVG donut dial for the 0–100 Trust Score.
export function ScoreDial({
  score,
  label,
  sublabel,
}: {
  score: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const r = 64;
  const c = 2 * Math.PI * r;
  const filled = (clamped / 100) * c;

  const tone =
    clamped >= 75 ? "#1a7d81" : clamped >= 50 ? "#b19262" : "#cf4e20";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="176" height="176" viewBox="0 0 176 176" role="img" aria-label={`${label}: ${clamped}`}>
        <circle cx="88" cy="88" r={r} fill="none" stroke="#e4dbc6" strokeWidth="14" />
        <circle
          cx="88"
          cy="88"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 88 88)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-extrabold" style={{ color: tone }}>
          {clamped}
        </span>
        {sublabel && <span className="mt-1 text-xs text-sand-700">{sublabel}</span>}
      </div>
    </div>
  );
}

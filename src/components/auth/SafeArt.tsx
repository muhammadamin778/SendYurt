/**
 * Stylised vault/safe illustration for the auth hero — money kept safe. Flat
 * SVG in SendYurt cobalt with a teal dial. Hardcoded colours (a physical
 * object, not theme-reactive).
 */
export function SafeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 360" className={className} role="img" aria-label="A safe" fill="none">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8ad6" />
          <stop offset="1" stopColor="#2f5096" />
        </linearGradient>
        <linearGradient id="door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7fce" />
          <stop offset="1" stopColor="#39619f" />
        </linearGradient>
        <radialGradient id="sheen" cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* base shadow */}
      <ellipse cx="184" cy="306" rx="120" ry="20" fill="#2f5096" opacity="0.14" />

      {/* safe body */}
      <rect x="66" y="70" width="228" height="220" rx="34" fill="url(#body)" />
      <rect x="66" y="70" width="228" height="220" rx="34" fill="url(#sheen)" />
      {/* feet */}
      <rect x="86" y="286" width="24" height="24" rx="7" fill="#284778" />
      <rect x="250" y="286" width="24" height="24" rx="7" fill="#284778" />

      {/* door inset */}
      <rect x="90" y="94" width="180" height="172" rx="24" fill="url(#door)" />
      <rect x="90" y="94" width="180" height="172" rx="24" fill="none" stroke="#6f9adb" strokeOpacity="0.4" strokeWidth="2" />

      {/* combination dial */}
      <g transform="translate(150 180)">
        {Array.from({ length: 24 }).map((_, i) => (
          <rect
            key={i}
            x="-1.4"
            y="-46"
            width="2.8"
            height="8"
            rx="1.4"
            fill="#bfe9e2"
            transform={`rotate(${i * 15})`}
          />
        ))}
        <circle r="38" fill="#5fd6c8" />
        <circle r="38" fill="url(#sheen)" />
        <circle r="24" fill="#3fb8ab" />
        <circle r="11" fill="#eafaf7" />
      </g>

      {/* three-spoke handle */}
      <g transform="translate(238 214)">
        <circle r="30" fill="#3a619d" />
        {[0, 120, 240].map((deg) => (
          <rect key={deg} x="-5" y="-30" width="10" height="30" rx="5" fill="#cfe0f5" transform={`rotate(${deg})`} />
        ))}
        <circle r="9" fill="#8fb4e6" />
      </g>
    </svg>
  );
}

export function AuthIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 96"
      className={className}
      role="img"
      aria-label="A shopper carries your order from the market to your door"
    >
      <path
        d="M44 62 C 90 20, 150 20, 176 52 S 250 84, 286 50"
        fill="none"
        stroke="rgb(var(--brand-green-fresh))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 8"
      />
      <g transform="translate(14 44)">
        <rect x="6" y="18" width="36" height="20" rx="3" fill="rgb(var(--brand-green-mist))" stroke="rgb(var(--brand-green))" strokeWidth="2" />
        <path d="M2 18 L8 6 H40 L46 18 Z" fill="rgb(var(--brand-yellow))" />
        <path d="M2 18 H46" stroke="rgb(var(--brand-green-deep))" strokeWidth="2" strokeLinecap="round" />
        <rect x="19" y="26" width="10" height="12" rx="1.5" fill="rgb(var(--brand-green))" />
      </g>
      <g transform="translate(262 34)">
        <path d="M2 24 L22 6 L42 24" fill="none" stroke="rgb(var(--brand-green-deep))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="8" y="22" width="28" height="24" rx="2" fill="rgb(var(--brand-green-mist))" stroke="rgb(var(--brand-green))" strokeWidth="2" />
        <rect x="18" y="32" width="8" height="14" rx="1.5" fill="rgb(var(--brand-green))" />
      </g>
      <g transform="translate(150 22)">
        <circle cx="14" cy="14" r="17" fill="rgb(var(--brand-green))" />
        <path d="M8 11 h12 l1.5 10 h-15 z" fill="#fff" />
        <path d="M10.5 11 a3.5 3.5 0 0 1 7 0" fill="none" stroke="#fff" strokeWidth="1.8" />
      </g>
      <circle cx="44" cy="62" r="3.5" fill="rgb(var(--brand-yellow))" />
      <circle cx="286" cy="50" r="3.5" fill="rgb(var(--brand-yellow))" />
    </svg>
  );
}

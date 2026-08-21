interface DukaLogoProps {
  /** Rendered size in px. The mark is drawn on a 100×100 grid and scales cleanly. */
  size?: number;
  className?: string;
  /** Include the DUKA wordmark beside the mark. */
  withWordmark?: boolean;
  /** Include the strapline under the wordmark. Implies `withWordmark`. */
  withStrapline?: boolean;
}

/**
 * The Duka mark: a "d" built from a ring, a location pin at its centre, and a
 * shopping bag hanging off the ascender — someone finding a thing, somewhere.
 *
 * Drawn rather than shipped as an image on purpose. At 16px in a browser tab a
 * downscaled PNG turns to mush, and a raster logo cannot follow the accent
 * palette. Everything here is `currentColor`, so the mark inherits whatever it
 * is placed on: white on the gradient badge, brand green on paper.
 */
export function DukaMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      role="img"
      aria-label="Duka"
    >
      {/* The bag, hanging from the top of the ascender. */}
      <path
        d="M63 13 v-2 a7 7 0 0 1 14 0 v2"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M58.5 14 h23 a2.5 2.5 0 0 1 2.5 2.8 l-1.8 14a3.5 3.5 0 0 1-3.5 3.2 h-17.4 a3.5 3.5 0 0 1-3.5-3.2 l-1.8-14 A2.5 2.5 0 0 1 58.5 14 Z"
        fill="currentColor"
      />

      {/* The outer ring plus the ascender — together they read as a "d". */}
      <circle cx="42" cy="60" r="28" stroke="currentColor" strokeWidth="10" />
      <path d="M70 36 v24" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />

      {/* Inner ring, deliberately open at the bottom so the pin can drop
          through it rather than sitting on top of a closed circle. */}
      <path
        d="M27.9 65.1 A 15 15 0 1 1 56.1 65.1"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* The pin. */}
      <path
        d="M42 76 C 36 67.5 33.5 61.5 33.5 56.5 A 8.5 8.5 0 1 1 50.5 56.5 C 50.5 61.5 48 67.5 42 76 Z"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="55.5" r="3.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Mark plus wordmark, for places with room for the full lockup — the landing
 * hero, the auth pages, an empty state.
 */
export function DukaLogo({ size = 40, className = '', withWordmark, withStrapline }: DukaLogoProps) {
  if (!withWordmark && !withStrapline) return <DukaMark size={size} className={className} />;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <DukaMark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className="font-display font-bold tracking-[0.14em] text-brand-green-deep"
          style={{ fontSize: size * 0.52 }}
        >
          DUKA
        </span>
        {withStrapline && (
          <span className="mt-1 text-brand-ink/55" style={{ fontSize: size * 0.24 }}>
            If you want it, we find it.
          </span>
        )}
      </span>
    </span>
  );
}

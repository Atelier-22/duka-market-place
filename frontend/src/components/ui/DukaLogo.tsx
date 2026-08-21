import { BRAND } from '../../config/brand';

interface DukaMarkProps {
  /** Rendered size in px. The source is 512×512, so it stays sharp. */
  size?: number;
  /**
   * `brand` is the artwork as supplied, in Duka green — correct on light
   * surfaces. `light` is the same mark in white, for dark backgrounds like
   * the footer, where the green would disappear.
   */
  variant?: 'brand' | 'light';
  className?: string;
}

/**
 * The Duka mark: the ring "d" with a location pin at its centre and a shopping
 * bag on the ascender.
 *
 * This is the real artwork, cropped out of the supplied lockup — deliberately
 * the mark on its own, with no wordmark. The full logo reads as a smudge below
 * about 64px, and the tab icon is 16px.
 */
export function DukaMark({ size = 32, variant = 'brand', className = '' }: DukaMarkProps) {
  return (
    <img
      src={variant === 'light' ? '/duka-mark-light.png' : '/duka-mark.png'}
      width={size}
      height={size}
      alt="Duka"
      // Never let a container's flex rules squash it out of square.
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      className={className}
      draggable={false}
    />
  );
}

interface DukaLockupProps {
  /** Size of the mark; the type scales from it. */
  markSize?: number;
  /** e.g. "Shopper" — the account view you are in, shown under the slogan. */
  roleLabel?: string;
  /** `light` for dark surfaces, where brand green would disappear. */
  variant?: 'brand' | 'light';
  /** Left-align instead of centring, for a footer column. */
  align?: 'center' | 'left';
  className?: string;
}

/**
 * The vertical lockup: mark on top, the name under it, the slogan under that.
 *
 * Set as live text rather than using the flattened logo image, so the slogan
 * stays legible at small sizes, scales with the user's font settings, and can
 * be read out by a screen reader.
 */
export function DukaLockup({
  markSize = 44,
  roleLabel,
  variant = 'brand',
  align = 'center',
  className = '',
}: DukaLockupProps) {
  const light = variant === 'light';
  return (
    <div
      className={[
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      ].join(' ')}
    >
      <DukaMark size={markSize} variant={variant} />
      <p
        className={`mt-1.5 font-display font-semibold leading-none ${light ? 'text-white' : 'text-brand-green-deep'}`}
        style={{ fontSize: Math.round(markSize * 0.42) }}
      >
        {BRAND.name}
      </p>
      <p
        className={`mt-1 leading-tight ${light ? 'text-white/60' : 'text-brand-ink/50'}`}
        style={{ fontSize: Math.max(9, Math.round(markSize * 0.2)) }}
      >
        {BRAND.tagline}
      </p>
      {roleLabel && (
        <p
          className={`mt-1.5 uppercase tracking-wider ${light ? 'text-white/40' : 'text-brand-ink/35'}`}
          style={{ fontSize: Math.max(9, Math.round(markSize * 0.19)) }}
        >
          {roleLabel}
        </p>
      )}
    </div>
  );
}

interface DukaLogoProps {
  /** Width in px; the height follows the artwork's own proportions. */
  width?: number;
  className?: string;
}

/**
 * The full lockup — mark, wordmark and strapline — for places with room for it:
 * the landing hero, an empty state, a printed receipt.
 */
export function DukaLogo({ width = 180, className = '' }: DukaLogoProps) {
  return (
    <img
      src="/duka-logo.png"
      alt="Duka — If you want it, we find it."
      style={{ width, height: 'auto' }}
      className={className}
      draggable={false}
    />
  );
}

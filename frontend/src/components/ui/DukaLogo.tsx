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

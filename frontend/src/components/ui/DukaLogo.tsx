import { BRAND } from '../../config/brand';

interface DukaMarkProps {

  size?: number;

  variant?: 'brand' | 'light';
  className?: string;
}

export function DukaMark({ size = 32, variant = 'brand', className = '' }: DukaMarkProps) {
  return (
    <img
      src={variant === 'light' ? '/duka-mark-light.png' : '/duka-mark.png'}
      width={size}
      height={size}
      alt="Duka"

      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      className={className}
      draggable={false}
    />
  );
}

interface DukaLockupProps {

  markSize?: number;

  roleLabel?: string;

  variant?: 'brand' | 'light';

  align?: 'center' | 'left';
  className?: string;
}

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
        className={`mt-1 leading-tight ${light ? 'text-white/60' : 'text-ink-3'}`}
        style={{ fontSize: Math.max(9, Math.round(markSize * 0.2)) }}
      >
        {BRAND.tagline}
      </p>
      {roleLabel && (
        <p
          className={`mt-1.5 uppercase tracking-wider ${light ? 'text-white/40' : 'text-ink-3'}`}
          style={{ fontSize: Math.max(9, Math.round(markSize * 0.19)) }}
        >
          {roleLabel}
        </p>
      )}
    </div>
  );
}

interface DukaLogoProps {

  width?: number;
  className?: string;
}

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

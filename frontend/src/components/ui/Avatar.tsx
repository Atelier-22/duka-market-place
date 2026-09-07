export function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Photo when there is one, brand-green initials when there is not. */
export function Avatar({ name, src, size = 40, className = '' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) };
  if (src) {
    return <img src={src} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-green font-semibold text-white ${className}`}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

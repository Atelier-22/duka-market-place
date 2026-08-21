import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  /** Shown in the viewer's toolbar — e.g. "Receipt · 12 Aug". */
  caption?: string;
  /** Classes for the thumbnail itself. */
  className?: string;
  /** Classes for the wrapper, when the thumbnail needs to fill a cell. */
  wrapperClassName?: string;
}

/**
 * A thumbnail that opens in the full-screen zoom viewer.
 *
 * Anywhere a photo matters — an item the shopper found, a receipt, a
 * verification document — the thumbnail is too small to actually check, which
 * is the one thing it exists for. This is the drop-in replacement for a bare
 * `<img>` in those places.
 */
export function ZoomableImage({ src, alt = '', caption, className = '', wrapperClassName = '' }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        title="Tap to zoom"
        aria-label={alt ? `View ${alt} full screen` : 'View photo full screen'}
        className={`group relative block cursor-zoom-in overflow-hidden ${wrapperClassName}`}
      >
        <img src={src} alt={alt} loading="lazy" className={className} />
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Maximize2 size={12} strokeWidth={2.25} />
        </span>
      </button>
      {open && <ImageLightbox src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}

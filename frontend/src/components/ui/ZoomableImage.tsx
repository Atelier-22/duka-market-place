import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  wrapperClassName?: string;
}

export function ZoomableImage({ src, alt = '', caption, className = '', wrapperClassName = '' }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        title="Tap to zoom"
        aria-label={alt ? `View ${alt} full screen` : 'View photo full screen'}
        className={`group relative block cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:shadow-focus ${wrapperClassName}`}
      >
        <img src={src} alt={alt} loading="lazy" className={className} />
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 size={13} strokeWidth={2.25} />
        </span>
      </button>
      {open && <ImageLightbox src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}

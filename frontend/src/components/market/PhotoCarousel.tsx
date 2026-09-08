import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';

interface PhotoCarouselProps {
  images: string[];
  alt: string;
  intervalMs?: number;
  onOpen?: (index: number) => void;
  className?: string;
}

const RESUME_AFTER_MS = 8000;

export function PhotoCarousel({ images, alt, intervalMs = 5000, onOpen, className = '' }: PhotoCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);
  const programmatic = useRef(false);

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    setIndex(i);
    setTimeout(() => { programmatic.current = false; }, smooth ? 450 : 0);
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      if (document.hidden) return;
      setIndex((current) => {
        const next = (current + 1) % images.length;
        const el = track.current;
        if (el) {
          programmatic.current = true;
          el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
          setTimeout(() => { programmatic.current = false; }, 450);
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (programmatic.current) return;
      pausedUntil.current = Date.now() + RESUME_AFTER_MS;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setIndex(Math.max(0, Math.min(images.length - 1, i)));
      });
    };
    const onTouch = () => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('pointerdown', onTouch, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('pointerdown', onTouch);
      cancelAnimationFrame(frame);
    };
  }, [images.length]);

  useEffect(() => { setIndex(0); scrollTo(0, false); }, [images, scrollTo]);

  if (images.length === 0) {
    return (
      <div className={`surface flex aspect-square w-full items-center justify-center rounded-3xl text-ink-3 shadow-card ${className}`}>
        <ImageOff size={40} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={track}
          className="surface flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-3xl shadow-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label={`${alt} photos`}
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => onOpen?.(i)}
              className="relative h-full w-full shrink-0 snap-center"
              aria-label={`Photo ${i + 1} of ${images.length}. Open full screen`}
            >
              <img src={src} alt={`${alt}, photo ${i + 1}`} className="h-full w-full object-cover" draggable={false} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        )}
        {onOpen && (
          <button type="button" onClick={() => onOpen(index)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/60 text-white" aria-label="Zoom photo">
            <Maximize2 size={16} />
          </button>
        )}
        {images.length > 1 && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/60 px-2 py-0.5 text-caption font-semibold text-white">{index + 1}/{images.length}</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button key={src + 't' + i} type="button" onClick={() => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; scrollTo(i); }} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${i === index ? 'border-brand-green' : 'border-transparent'}`} aria-label={`Show photo ${i + 1}`} aria-current={i === index}>
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

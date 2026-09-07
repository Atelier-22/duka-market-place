import { useEffect, useState } from 'react';
import { Bike, Camera, Heart, LucideIcon, ShoppingCart } from 'lucide-react';
import { prefersReducedMotion } from '../../config/motion';

interface Slide {
  icon: LucideIcon;
  title: string;
  caption: string;
}

const SLIDES: Slide[] = [
  {
    icon: ShoppingCart,
    title: 'Any market, any stall',
    caption: 'Owino, Nakasero, Kalerwe — name the place and a shopper who knows it goes for you.',
  },
  {
    icon: Camera,
    title: 'See it before you pay',
    caption: 'Real photos and the real asking price, sent to you before a single shilling moves.',
  },
  {
    icon: Bike,
    title: 'Delivered to your door',
    caption: 'Track your shopper from the stall to your gate, every step of the way.',
  },
  {
    icon: Heart,
    title: 'Earn shopping for others',
    caption: 'Turn the trips you already make into income — your area, your hours.',
  },
];

const SLIDE_MS = 6000;

/**
 * A solid deep-brand statement panel that rotates four short statements.
 * Slides are stacked in one grid cell and crossfade; the dots are real
 * buttons with 44px targets. Auto-advance pauses on hover/focus and is
 * skipped entirely when the user prefers reduced motion.
 */
export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused]);

  return (
    <section
      className="surface-deep rounded-3xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16"
      aria-roledescription="carousel"
      aria-label="What Duka does"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="grid" aria-live="polite">
        {SLIDES.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={slide.title}
              className={[
                'col-start-1 row-start-1 min-w-0 max-w-2xl transition-opacity duration-300 ease-standard',
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
              aria-hidden={!isActive}
            >
              <slide.icon size={32} strokeWidth={1.5} className="text-brand-green-fresh" aria-hidden="true" />
              <p className="mt-6 font-display text-h1 font-medium text-white md:text-display">{slide.title}</p>
              <p className="mt-3 max-w-xl text-body text-white/75">{slide.caption}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 -ml-4 flex" role="group" aria-label="Choose a statement">
        {SLIDES.map((slide, i) => {
          const isActive = i === active;
          return (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${i + 1} of ${SLIDES.length}: ${slide.title}`}
              aria-current={isActive ? 'true' : undefined}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span
                className={[
                  'block h-2 rounded-full transition-all duration-200 ease-standard',
                  isActive ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

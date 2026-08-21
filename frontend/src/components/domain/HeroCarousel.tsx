import { useEffect, useState } from 'react';

interface Slide {
  icon: string;
  title: string;
  caption: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    icon: '🛒',
    title: 'Any market, any stall',
    caption: 'Owino, Nakasero, Kalerwe — name the place and a shopper who knows it goes for you.',
    gradient: 'from-brand-green-deep via-brand-green to-brand-green-fresh',
  },
  {
    icon: '📸',
    title: 'See it before you pay',
    caption: 'Real photos and the real asking price, sent to you before a single shilling moves.',
    gradient: 'from-brand-green via-brand-green-fresh to-brand-yellow',
  },
  {
    icon: '🚴',
    title: 'Delivered to your door',
    caption: 'Track your shopper from the stall to your gate, every step of the way.',
    gradient: 'from-brand-yellow via-brand-green-fresh to-brand-green',
  },
  {
    icon: '💚',
    title: 'Earn shopping for others',
    caption: 'Turn the trips you already make into income — your area, your hours.',
    gradient: 'from-brand-green-fresh via-brand-green to-brand-green-deep',
  },
];

const SLIDE_MS = 5000;

/**
 * Auto-advancing hero carousel for the landing page. Slides are all stacked
 * on top of each other and crossfaded with opacity so there's no layout
 * shift and no horizontal scrolling to manage.
 */
export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div className="relative overflow-hidden rounded-xl3 shadow-glass-lg">
      {/* Sizing element: keeps the box as tall as the tallest slide. */}
      <div className="invisible px-8 py-16 md:px-14 md:py-24" aria-hidden="true">
        <p className="text-5xl md:text-6xl">🛒</p>
        <p className="mt-5 font-display text-3xl font-medium md:text-5xl">
          {SLIDES.reduce((a, b) => (a.title.length > b.title.length ? a : b)).title}
        </p>
        <p className="mt-4 max-w-xl text-base md:text-lg">
          {SLIDES.reduce((a, b) => (a.caption.length > b.caption.length ? a : b)).caption}
        </p>
      </div>

      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className={[
            'absolute inset-0 flex flex-col justify-center bg-gradient-to-br px-8 py-16 md:px-14 md:py-24',
            'transition-opacity duration-[1500ms] ease-in-out',
            slide.gradient,
            i === active ? 'opacity-100' : 'pointer-events-none opacity-0',
          ].join(' ')}
          aria-hidden={i !== active}
        >
          <span className="text-5xl md:text-6xl">{slide.icon}</span>
          <p className="mt-5 font-display text-3xl font-medium text-white md:text-5xl">
            {slide.title}
          </p>
          <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">{slide.caption}</p>
        </div>
      ))}

      {/* DOT NAV */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            aria-current={i === active}
            className={[
              'h-2.5 rounded-full transition-all duration-500 ease-out',
              i === active ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

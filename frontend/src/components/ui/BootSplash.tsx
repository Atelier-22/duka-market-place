import { useEffect, useState } from 'react';
import { DukaMark } from './DukaLogo';
import { BRAND } from '../../config/brand';

const SHOW_MS = 5000;
const FADE_MS = 420;

export function BootSplash() {
  const [phase, setPhase] = useState<'shown' | 'leaving' | 'done'>(() =>
    typeof navigator !== 'undefined' && navigator.webdriver ? 'done' : 'shown'
  );

  useEffect(() => {
    if (phase === 'done') return;
    const leave = setTimeout(() => setPhase('leaving'), SHOW_MS);
    const done = setTimeout(() => setPhase('done'), SHOW_MS + FADE_MS);
    return () => { clearTimeout(leave); clearTimeout(done); };
  }, []);

  if (phase === 'done') return null;

  return (
    <div className="duka-boot" data-leaving={phase === 'leaving' ? 'true' : undefined} role="status" aria-live="polite" aria-label={`${BRAND.name} is loading`}>
      <div className="duka-boot__stage">
        <span className="duka-boot__glow" />
        <DukaMark size={104} variant="light" className="duka-boot__mark" />
        <p className="duka-boot__name">{BRAND.name}</p>
        <p className="duka-boot__text">
          {BRAND.name} is loading<span className="duka-boot__dots" aria-hidden><span>.</span><span>.</span><span>.</span></span>
        </p>
      </div>
    </div>
  );
}

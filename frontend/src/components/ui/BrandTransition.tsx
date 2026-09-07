import {
  CSSProperties,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DukaMark } from './DukaLogo';
import { BRAND } from '../../config/brand';
import {
  LOGO_HOLD_DURATION,
  LOGO_SPRING,
  LOGO_TRANSITION_DURATION,
  OVERLAY_DURATION,
  prefersReducedMotion,
  springTransition,
} from '../../config/motion';

/**
 * App-level brand transition: the screen dims under a translucent overlay,
 * the Duka mark scales into the centre with a glow that shifts colour, holds,
 * then the overlay lifts to reveal the new screen. Whatever `task` does
 * (navigate, switch account) happens while the interface is fully covered.
 */

type Phase = 'idle' | 'dim' | 'logo' | 'out';

interface PlayOptions {
  /** Small line under the brand name, e.g. "Switching to Shopper". */
  label?: string;
  /** Runs once the overlay is fully up. Rejections propagate after the overlay lifts. */
  task?: () => Promise<unknown> | unknown;
}

interface BrandTransitionValue {
  play: (opts?: PlayOptions) => Promise<void>;
  active: boolean;
}

const BrandTransitionContext = createContext<BrandTransitionValue | undefined>(undefined);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function BrandTransitionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [label, setLabel] = useState<string | undefined>();
  const running = useRef(false);

  const play = useCallback(async ({ label: nextLabel, task }: PlayOptions = {}) => {
    if (running.current || prefersReducedMotion()) {
      await task?.();
      return;
    }
    running.current = true;
    setLabel(nextLabel);
    setPhase('dim');
    await wait(OVERLAY_DURATION);
    setPhase('logo');

    const started = performance.now();
    let failure: unknown = null;
    try {
      await task?.();
    } catch (err) {
      failure = err;
    }
    const elapsed = performance.now() - started;
    await wait(Math.max(0, LOGO_TRANSITION_DURATION + LOGO_HOLD_DURATION - elapsed));

    setPhase('out');
    await wait(OVERLAY_DURATION);
    setPhase('idle');
    running.current = false;
    if (failure) throw failure;
  }, []);

  const value = useMemo(() => ({ play, active: phase !== 'idle' }), [play, phase]);

  const logoSpring = springTransition(LOGO_SPRING);
  const style = {
    '--overlay-ms': `${OVERLAY_DURATION}ms`,
    '--logo-ms': `${Math.max(logoSpring.duration, LOGO_TRANSITION_DURATION)}ms`,
    '--logo-ease': logoSpring.easing,
    '--glow-ms': `${LOGO_TRANSITION_DURATION + LOGO_HOLD_DURATION}ms`,
  } as CSSProperties;

  return (
    <BrandTransitionContext.Provider value={value}>
      {children}
      {phase !== 'idle' && (
        <div className="duka-brand-overlay" data-phase={phase} style={style} aria-hidden>
          <div className="duka-brand-overlay__stage">
            <span className="duka-brand-overlay__glow" />
            <DukaMark size={96} variant="light" className="duka-brand-overlay__mark" />
            <p className="duka-brand-overlay__name">{BRAND.name}</p>
            {label && <p className="duka-brand-overlay__label">{label}</p>}
          </div>
        </div>
      )}
    </BrandTransitionContext.Provider>
  );
}

export function useBrandTransition(): BrandTransitionValue {
  const ctx = useContext(BrandTransitionContext);
  if (!ctx) throw new Error('useBrandTransition must be used within BrandTransitionProvider');
  return ctx;
}

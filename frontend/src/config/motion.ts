
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const NAVIGATION_SPRING: SpringConfig = { stiffness: 420, damping: 28, mass: 1 };

export const NAV_BAR_HEIGHT = 64;
export const NAV_ICON_BOX = 26;
export const NAV_LABEL_HEIGHT = 14;
export const NAV_LABEL_GAP = 3;
export const NAV_PAD_BOTTOM = 7;

export const INDICATOR_SIZE = 52;
export const ACTIVE_RISE = 16;
export const ACTIVE_SCALE = 1.08;
export const INACTIVE_SCALE = 1;

export const NAV_ICON_REST_Y =
  NAV_BAR_HEIGHT - NAV_PAD_BOTTOM - NAV_LABEL_HEIGHT - NAV_LABEL_GAP - NAV_ICON_BOX / 2;
export const INDICATOR_TOP = NAV_ICON_REST_Y - ACTIVE_RISE - INDICATOR_SIZE / 2;

export const NAV_COLOR_DURATION = 220;
export const NAV_TINT_DURATION = 520;

export const OVERLAY_DURATION = 340;
export const LOGO_TRANSITION_DURATION = 620;
export const LOGO_HOLD_DURATION = 1900;
export const LOGO_SPRING: SpringConfig = { stiffness: 260, damping: 22, mass: 1 };

export const DURATION = { fast: 120, base: 200, slow: 320, page: 240 } as const;
export const EASE = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const AUTH_SPRING: SpringConfig = { stiffness: 200, damping: 23, mass: 1 };
export const AUTH_TEXT_DURATION = 360;

export const AUTH_PHASES = {
  contentOut: 200,
  cloudDelay: 90,
  cloudCollapse: 460,
  trough: 160,
  cloudExpand: 680,
  contentIn: 360,
  contentInDelay: 240,
} as const;

export const PRESS_SCALE = 0.94;
export const PRESS_DURATION = 120;

const SETTLE_THRESHOLD = 0.001;
const SAMPLES = 72;

let linearSupported: boolean | null = null;
function supportsLinearEasing(): boolean {
  if (linearSupported !== null) return linearSupported;
  try {
    linearSupported =
      typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
  } catch {
    linearSupported = false;
  }
  return linearSupported;
}

const cache = new Map<string, { easing: string; duration: number }>();

export function springTransition(cfg: SpringConfig): { easing: string; duration: number } {
  const key = `${cfg.stiffness}/${cfg.damping}/${cfg.mass}/${supportsLinearEasing() ? 'l' : 'b'}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const w0 = Math.sqrt(cfg.stiffness / cfg.mass);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));

  let position: (t: number) => number;
  let seconds: number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    position = (t) =>
      1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    seconds = Math.log(1 / SETTLE_THRESHOLD) / (zeta * w0);
  } else {
    position = (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    seconds = (Math.log(1 / SETTLE_THRESHOLD) / w0) * 1.6;
  }
  const duration = Math.round(seconds * 1000);

  let easing: string;
  if (supportsLinearEasing()) {
    const pts: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const v = i === SAMPLES ? 1 : position((i / SAMPLES) * seconds);
      pts.push(String(Math.round(v * 10000) / 10000));
    }
    easing = `linear(${pts.join(', ')})`;
  } else {
    const overshoot = zeta < 1 ? Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) : 0;
    easing = `cubic-bezier(0.3, ${(1 + overshoot * 4.5).toFixed(3)}, 0.45, 1)`;
  }

  const out = { easing, duration };
  cache.set(key, out);
  return out;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

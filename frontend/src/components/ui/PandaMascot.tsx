import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../config/motion';

interface PandaMascotProps {
  hiding?: boolean;
  peeking?: boolean;
  className?: string;
}

const LOOK_EASE = 0.11;
const IDLE_AFTER = 2600;

export function PandaMascot({ hiding = false, peeking = false, className = '' }: PandaMascotProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastPointer = 0;

    function aim(clientX: number, clientY: number) {
      const box = el!.getBoundingClientRect();
      const originX = box.left + box.width / 2;
      const originY = box.top + box.height * 0.42;
      const reachX = Math.max(box.width * 2.2, 320);
      const reachY = Math.max(box.height * 1.8, 260);
      targetX = Math.max(-1, Math.min(1, (clientX - originX) / reachX));
      targetY = Math.max(-1, Math.min(1, (clientY - originY) / reachY));
      lastPointer = performance.now();
    }

    function onPointer(e: PointerEvent) {
      aim(e.clientX, e.clientY);
    }

    function tick(now: number) {
      if (now - lastPointer > IDLE_AFTER) {
        const drift = (now - lastPointer) / 1000;
        targetX = Math.sin(drift * 0.7) * 0.32;
        targetY = Math.sin(drift * 0.45) * 0.18;
      }
      currentX += (targetX - currentX) * LOOK_EASE;
      currentY += (targetY - currentY) * LOOK_EASE;
      el!.style.setProperty('--look-x', currentX.toFixed(4));
      el!.style.setProperty('--look-y', currentY.toFixed(4));
      frame = requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  const state = hiding ? (peeking ? 'peeking' : 'hiding') : 'open';

  return (
    <svg
      ref={ref}
      viewBox="0 0 220 190"
      className={`panda ${className}`}
      data-state={state}
      role="img"
      aria-label="A panda mascot watching the form"
    >
      <ellipse className="panda__shadow" cx="110" cy="181" rx="58" ry="7" />

      <g className="panda__body">
        <path
          className="panda__ink"
          d="M62 186c-6-30 6-52 22-60l52 0c16 8 28 30 22 60z"
        />
        <path
          className="panda__fur"
          d="M74 186c-4-24 6-42 20-48l32 0c14 6 24 24 20 48z"
        />
        <path className="panda__scarf" d="M76 132c14 9 54 9 68 0l4 12c-16 11-60 11-76 0z" />
      </g>

      <g className="panda__head">
        <circle className="panda__ink" cx="64" cy="52" r="20" />
        <circle className="panda__ink" cx="156" cy="52" r="20" />
        <circle className="panda__inner-ear" cx="64" cy="52" r="9" />
        <circle className="panda__inner-ear" cx="156" cy="52" r="9" />

        <ellipse className="panda__fur" cx="110" cy="82" rx="58" ry="54" />

        <g className="panda__face">
          <ellipse className="panda__ink" cx="86" cy="76" rx="17" ry="20" transform="rotate(-14 86 76)" />
          <ellipse className="panda__ink" cx="134" cy="76" rx="17" ry="20" transform="rotate(14 134 76)" />

          <g className="panda__eyes">
            <circle className="panda__eye" cx="87" cy="75" r="7.5" />
            <circle className="panda__eye" cx="133" cy="75" r="7.5" />
            <g className="panda__pupils">
              <circle className="panda__pupil" cx="87" cy="75" r="4" />
              <circle className="panda__pupil" cx="133" cy="75" r="4" />
              <circle className="panda__glint" cx="88.8" cy="72.8" r="1.4" />
              <circle className="panda__glint" cx="134.8" cy="72.8" r="1.4" />
            </g>
          </g>

          <ellipse className="panda__blush" cx="66" cy="96" rx="9" ry="6" />
          <ellipse className="panda__blush" cx="154" cy="96" rx="9" ry="6" />

          <path className="panda__nose" d="M104 98h12c2 0 3 2 2 4l-5 5c-2 2-4 2-6 0l-5-5c-1-2 0-4 2-4z" />
          <path className="panda__mouth" d="M110 108v5m0 0c0 5-5 8-9 5m9-5c0 5 5 8 9 5" />
        </g>
      </g>

      <g className="panda__paw panda__paw--left">
        <ellipse className="panda__ink" cx="74" cy="166" rx="14" ry="11.5" transform="rotate(-18 74 166)" />
        <ellipse className="panda__pad" cx="74" cy="166" rx="6.5" ry="5" transform="rotate(-18 74 166)" />
      </g>
      <g className="panda__paw panda__paw--right">
        <ellipse className="panda__ink" cx="146" cy="166" rx="14" ry="11.5" transform="rotate(18 146 166)" />
        <ellipse className="panda__pad" cx="146" cy="166" rx="6.5" ry="5" transform="rotate(18 146 166)" />
      </g>
    </svg>
  );
}

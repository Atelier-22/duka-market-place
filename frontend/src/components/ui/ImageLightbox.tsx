import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Minus, Plus, RotateCw, X } from 'lucide-react';
import { downloadUrl } from '../../utils/download';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 0.4;

interface ImageLightboxProps {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } }): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

const toolbarButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-[background-color,transform] duration-150 ease-standard hover:bg-white/20 active:scale-[0.96] focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-40';

export function ImageLightbox({ src, alt = '', caption, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const zoomTo = useCallback((next: number) => {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(clamped);

    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') zoomTo(scale + STEP);
      else if (e.key === '-' || e.key === '_') zoomTo(scale - STEP);
      else if (e.key === '0') { zoomTo(MIN_SCALE); setRotation(0); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, scale, zoomTo]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadUrl(src);
    } finally {
      setDownloading(false);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= MIN_SCALE) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) });
  }

  function handlePointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(e.touches), scale };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const pinch = pinchRef.current;
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    zoomTo(pinch.scale * (touchDistance(e.touches) / pinch.distance));
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image viewer'}
      className="fixed inset-0 z-[100] flex animate-fade-in flex-col bg-[rgb(var(--overlay-bg)_/_0.92)]"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 truncate pl-1 text-small text-white/80">{caption}</span>
        <button type="button" onClick={onClose} className={toolbarButton} aria-label="Close" title="Close (Esc)">
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-6"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => zoomTo(scale - Math.sign(e.deltaY) * STEP)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { pinchRef.current = null; }}
        onDoubleClick={() => zoomTo(scale > MIN_SCALE ? MIN_SCALE : 2.5)}
        style={{ cursor: scale > MIN_SCALE ? (dragRef.current ? 'grabbing' : 'grab') : 'zoom-in', touchAction: 'none' }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: dragRef.current || pinchRef.current ? 'none' : 'transform 140ms ease-out',
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pb-3 pt-2 sm:pb-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => zoomTo(scale - STEP)} disabled={scale <= MIN_SCALE} className={toolbarButton} aria-label="Zoom out" title="Zoom out">
            <Minus size={18} strokeWidth={2} />
          </button>
          <span className="w-12 text-center text-caption font-semibold tabular-nums text-white/70">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" onClick={() => zoomTo(scale + STEP)} disabled={scale >= MAX_SCALE} className={toolbarButton} aria-label="Zoom in" title="Zoom in">
            <Plus size={18} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => setRotation((r) => r + 90)} className={toolbarButton} aria-label="Rotate" title="Rotate">
            <RotateCw size={17} strokeWidth={2} />
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className={toolbarButton} aria-label="Download" title="Download">
            <Download size={17} strokeWidth={2} />
          </button>
        </div>
        <p className="text-center text-caption text-white/50">
          <span className="hidden sm:inline">Double-click or scroll to zoom · drag to move · Esc to close</span>
          <span className="sm:hidden">Pinch or double-tap to zoom · drag to move</span>
        </p>
      </div>
    </div>,
    document.body
  );
}

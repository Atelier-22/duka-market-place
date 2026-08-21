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
  /** Shown under the toolbar — e.g. who sent it and when. */
  caption?: string;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Distance between two touch points, for pinch-zoom. Typed structurally rather
 * than as `TouchList` — React's synthetic TouchList is not the DOM one.
 */
function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } }): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Full-screen image viewer: zoom by wheel, pinch, buttons or double-tap; pan by
 * dragging once zoomed; rotate for photos that came off a phone sideways; and
 * download the original.
 *
 * Rendered through a portal so it escapes the chat bubble's `overflow-hidden`
 * and stacking context — inside the message list it would otherwise be clipped
 * to a 75%-wide box.
 */
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
    // Snapping back to 1× must recentre, or the image stays parked off-screen
    // where the user last dragged it.
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  // Escape closes; +/- zoom, so the viewer is usable without a mouse.
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

  // The page behind must not scroll while the viewer is open.
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

  const toolbarButton =
    'flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-40';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image viewer'}
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      // Clicking the backdrop closes; clicks on the image itself stop below.
      onClick={onClose}
    >
      <div
        className="flex items-center justify-end gap-2 p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mr-auto min-w-0 truncate pl-1 text-sm text-white/70">{caption}</span>
        <button onClick={() => zoomTo(scale - STEP)} disabled={scale <= MIN_SCALE} className={toolbarButton} aria-label="Zoom out" title="Zoom out">
          <Minus size={18} strokeWidth={2} />
        </button>
        <span className="w-12 text-center text-xs font-medium tabular-nums text-white/60">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => zoomTo(scale + STEP)} disabled={scale >= MAX_SCALE} className={toolbarButton} aria-label="Zoom in" title="Zoom in">
          <Plus size={18} strokeWidth={2} />
        </button>
        <button onClick={() => setRotation((r) => r + 90)} className={toolbarButton} aria-label="Rotate" title="Rotate">
          <RotateCw size={17} strokeWidth={2} />
        </button>
        <button onClick={handleDownload} disabled={downloading} className={toolbarButton} aria-label="Download" title="Download">
          <Download size={17} strokeWidth={2} />
        </button>
        <button onClick={onClose} className={toolbarButton} aria-label="Close" title="Close">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-6"
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

      <p className="pb-3 text-center text-[11px] text-white/35" onClick={(e) => e.stopPropagation()}>
        Double-tap or scroll to zoom · drag to move · Esc to close
      </p>
    </div>,
    document.body
  );
}

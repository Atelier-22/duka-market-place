import { Suspense, lazy } from 'react';
import type { MapPoint } from './LiveMap';

/**
 * Leaflet and its CSS are ~150kB — worth loading only when a map is actually
 * on screen, which is just the active-order and workflow pages. Everywhere
 * else the bundle never touches it.
 */
const LiveMap = lazy(() => import('./LiveMap').then((m) => ({ default: m.LiveMap })));

interface LazyLiveMapProps {
  shopper: MapPoint | null;
  destination: MapPoint | null;
  className?: string;
}

export function LazyLiveMap(props: LazyLiveMapProps) {
  return (
    <Suspense
      fallback={
        <div className="shimmer-bg flex h-72 w-full items-center justify-center rounded-xl2 text-sm text-brand-ink/40">
          Loading map…
        </div>
      }
    >
      <LiveMap {...props} />
    </Suspense>
  );
}

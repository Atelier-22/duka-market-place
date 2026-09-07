import { Suspense, lazy } from 'react';
import type { MapPoint } from './LiveMap';

const LiveMap = lazy(() => import('./LiveMap').then((m) => ({ default: m.LiveMap })));

interface LazyLiveMapProps {
  you: MapPoint | null;
  them: MapPoint | null;
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

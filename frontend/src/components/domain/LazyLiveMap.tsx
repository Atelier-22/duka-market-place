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
        <div
          role="status"
          aria-busy="true"
          className="surface-2 flex h-72 w-full items-center justify-center rounded-xl text-small text-ink-3"
        >
          Loading map…
        </div>
      }
    >
      <LiveMap {...props} />
    </Suspense>
  );
}

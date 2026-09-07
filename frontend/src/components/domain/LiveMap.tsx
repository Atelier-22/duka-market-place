import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveMapProps {

  you: MapPoint | null;

  them: MapPoint | null;

  destination: MapPoint | null;
  className?: string;
}

/**
 * Leaflet paints vector layers with SVG presentation attributes, which cannot
 * read CSS variables, so the route colour is resolved from the token at
 * creation time. Marker icons are plain HTML and use `rgb(var(--…))` inline.
 */
function tokenColor(name: string): string {
  if (typeof window === 'undefined') return 'currentColor';
  const triplet = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return triplet ? `rgb(${triplet})` : 'currentColor';
}

export function LiveMap({ you, them, destination, className = '' }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const themMarker = useRef<L.Marker | null>(null);
  const youMarker = useRef<L.Marker | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

  const userMoved = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
      .setView([0.3476, 32.5825], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('dragstart', () => { userMoved.current = true; });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    themMarker.current = place(map, themMarker.current, them, otherPartyIcon, 'Them');
    youMarker.current = place(map, youMarker.current, you, youIcon, 'You');
    destMarker.current = place(map, destMarker.current, destination, destinationIcon, 'Delivery address');

    const target = them ?? destination;
    if (you && target) {
      const line: L.LatLngExpression[] = [[you.lat, you.lng], [target.lat, target.lng]];
      if (routeLine.current) {
        routeLine.current.setLatLngs(line);
      } else {
        routeLine.current = L.polyline(line, {
          color: tokenColor('--brand-green'), weight: 3, opacity: 0.5, dashArray: '6 8',
        }).addTo(map);
      }
      if (!userMoved.current) {
        map.fitBounds(L.latLngBounds(line as L.LatLngTuple[]), { padding: [40, 40], maxZoom: 16 });
      }
    } else if (!userMoved.current) {

      const focus = them ?? destination ?? you;
      if (focus) map.setView([focus.lat, focus.lng], 15);
    }
  }, [you, them, destination]);

  return <div ref={containerRef} className={`h-72 w-full overflow-hidden rounded-xl ${className}`} />;
}

function place(
  map: L.Map,
  marker: L.Marker | null,
  point: MapPoint | null,
  icon: L.DivIcon,
  fallbackLabel: string
): L.Marker | null {
  if (!point) {
    if (marker) map.removeLayer(marker);
    return null;
  }
  const pos: L.LatLngExpression = [point.lat, point.lng];
  const next = marker ? marker.setLatLng(pos) : L.marker(pos, { icon }).addTo(map);
  next.bindTooltip(point.label ?? fallbackLabel, { direction: 'top', offset: [0, -12] });
  return next;
}

/* Markers sit on light map tiles in every theme, so they use the accent
   tokens that do not flip in dark mode, plus a white keyline. */

const otherPartyIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px">
    <span style="position:absolute;inset:0;border-radius:9999px;background:rgb(var(--brand-green-fresh));opacity:.25;animation:duka-ping 1.8s cubic-bezier(0,0,.2,1) infinite"></span>
    <span style="position:relative;width:16px;height:16px;border-radius:9999px;background:rgb(var(--brand-green-fresh));border:3px solid white;box-shadow:0 1px 4px rgb(0 0 0 / .35)"></span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const youIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px">
    <span style="width:12px;height:12px;border-radius:9999px;background:rgb(var(--info));border:3px solid white;box-shadow:0 1px 3px rgb(0 0 0 / .35)"></span>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round"
         style="stroke:rgb(var(--brand-green));filter:drop-shadow(0 1px 2px rgb(0 0 0 / .3))">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" style="fill:white"/>
      <circle cx="12" cy="10" r="3" stroke="none" style="fill:rgb(var(--brand-green))"/>
    </svg>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

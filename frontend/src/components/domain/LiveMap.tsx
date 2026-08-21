import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveMapProps {
  shopper: MapPoint | null;
  destination: MapPoint | null;
  className?: string;
}

/**
 * Leaflet is a plain DOM library, so the map instance lives in a ref and is
 * created once. Re-renders only move the markers — tearing the map down and
 * rebuilding it on every position update would flicker and lose the user's
 * pan/zoom.
 *
 * Tiles come from OpenStreetMap, which needs no API key. Swapping to Mapbox or
 * Google later is a one-line change of the tile URL.
 */
export function LiveMap({ shopper, destination, className = '' }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shopperMarker = useRef<L.Marker | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  /** Stop auto-fitting once the user has panned; nothing worse than a map that fights you. */
  const userMoved = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Kampala, as a sensible default before any position is known.
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

    if (shopper) {
      const pos: L.LatLngExpression = [shopper.lat, shopper.lng];
      if (shopperMarker.current) {
        shopperMarker.current.setLatLng(pos);
      } else {
        shopperMarker.current = L.marker(pos, { icon: shopperIcon }).addTo(map);
      }
      shopperMarker.current.bindTooltip(shopper.label ?? 'Your shopper', { direction: 'top', offset: [0, -12] });
    }

    if (destination) {
      const pos: L.LatLngExpression = [destination.lat, destination.lng];
      if (destMarker.current) {
        destMarker.current.setLatLng(pos);
      } else {
        destMarker.current = L.marker(pos, { icon: destinationIcon }).addTo(map);
      }
      destMarker.current.bindTooltip(destination.label ?? 'Delivery address', { direction: 'top', offset: [0, -12] });
    }

    if (shopper && destination) {
      const line: L.LatLngExpression[] = [[shopper.lat, shopper.lng], [destination.lat, destination.lng]];
      if (routeLine.current) {
        routeLine.current.setLatLngs(line);
      } else {
        routeLine.current = L.polyline(line, {
          color: '#16a34a', weight: 3, opacity: 0.5, dashArray: '6 8',
        }).addTo(map);
      }
      if (!userMoved.current) {
        map.fitBounds(L.latLngBounds(line as L.LatLngTuple[]), { padding: [40, 40], maxZoom: 16 });
      }
    } else if (shopper && !userMoved.current) {
      map.setView([shopper.lat, shopper.lng], 15);
    } else if (destination && !userMoved.current) {
      map.setView([destination.lat, destination.lng], 15);
    }
  }, [shopper, destination]);

  return <div ref={containerRef} className={`h-72 w-full rounded-xl2 ${className}`} />;
}

/**
 * Markers are inline SVG in a divIcon rather than Leaflet's default PNGs —
 * the defaults are loaded by a relative URL that breaks under a bundler, and
 * these match the brand palette.
 */
const shopperIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px">
    <span style="position:absolute;inset:0;border-radius:9999px;background:#16a34a;opacity:.25;animation:duka-ping 1.8s cubic-bezier(0,0,.2,1) infinite"></span>
    <span style="position:relative;width:16px;height:16px;border-radius:9999px;background:#16a34a;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f3d2e" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#fff"/>
      <circle cx="12" cy="10" r="3" fill="#0f3d2e" stroke="none"/>
    </svg>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TouristSpot, AccommodationDetail, RestaurantDetail } from '@/types/travel';

// Fix default marker icons
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const toCoord = (v: string | number) => Number(String(v).replace(',', '.'));

/**
 * SVG inline (não emoji — o marcador do Leaflet é HTML puro, não JSX, então
 * não dá pra usar o componente lucide-react direto; os `d` abaixo são os
 * mesmos paths dos ícones Hotel/Utensils/MapPin da própria lib, só embutidos
 * como string).
 */
const markerIconPaths: Record<'hotel' | 'utensils' | 'pin', string> = {
  hotel:
    '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
  utensils:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};

const svgIcon = (key: keyof typeof markerIconPaths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markerIconPaths[key]}</svg>`;

const createIcon = (color: string, iconKey: keyof typeof markerIconPaths) =>
  L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${svgIcon(iconKey)}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

interface TravelMapProps {
  spots: TouristSpot[];
  accommodation: AccommodationDetail | null;
  restaurants: RestaurantDetail[];
}

const TravelMap = ({ spots, accommodation, restaurants }: TravelMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const allPoints: [number, number][] = [];
    
    if (accommodation) allPoints.push([toCoord(accommodation.lat), toCoord(accommodation.lng)]);
    spots.forEach(s => allPoints.push([toCoord(s.lat), toCoord(s.lng)]));
    restaurants.forEach(r => allPoints.push([toCoord(r.lat), toCoord(r.lng)]));

    if (allPoints.length === 0) return;

    const center = allPoints.reduce(
      (acc, p) => [acc[0] + p[0] / allPoints.length, acc[1] + p[1] / allPoints.length],
      [0, 0]
    ) as [number, number];

    const map = L.map(mapRef.current).setView(center, 13);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Accommodation marker
    if (accommodation) {
      L.marker([toCoord(accommodation.lat), toCoord(accommodation.lng)], { icon: createIcon('#FF6B35', 'hotel') })
        .addTo(map)
        .bindPopup(`<b>${accommodation.name}</b><br/>${accommodation.address}<br/>Nota ${accommodation.rating} · R$ ${accommodation.pricePerNight}/noite`);
    }

    // Tourist spots
    spots.forEach(s => {
      L.marker([toCoord(s.lat), toCoord(s.lng)], { icon: createIcon('#00B4D8', 'pin') })
        .addTo(map)
        .bindPopup(`<b>${s.name}</b><br/>${s.description}<br/>Nota ${s.rating}`);
    });

    // Restaurants
    restaurants.forEach(r => {
      L.marker([toCoord(r.lat), toCoord(r.lng)], { icon: createIcon('#E91E63', 'utensils') })
        .addTo(map)
        .bindPopup(`<b>${r.name}</b><br/>${r.cuisine} · ${r.priceRange}<br/>Nota ${r.rating}`);
    });

    // Fit bounds
    if (allPoints.length > 1) {
      map.fitBounds(allPoints.map(p => [p[0], p[1]] as [number, number]), { padding: [30, 30] });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [spots, accommodation, restaurants]);

  return (
    <div ref={mapRef} className="w-full h-[400px] rounded-2xl overflow-hidden border border-border" />
  );
};

export default TravelMap;

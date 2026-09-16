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

const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${emoji}</div>`,
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
      L.marker([toCoord(accommodation.lat), toCoord(accommodation.lng)], { icon: createIcon('#FF6B35', '🏨') })
        .addTo(map)
        .bindPopup(`<b>${accommodation.name}</b><br/>${accommodation.address}<br/>⭐ ${accommodation.rating} · R$ ${accommodation.pricePerNight}/noite`);
    }

    // Tourist spots
    spots.forEach(s => {
      L.marker([toCoord(s.lat), toCoord(s.lng)], { icon: createIcon('#00B4D8', s.imageEmoji) })
        .addTo(map)
        .bindPopup(`<b>${s.name}</b><br/>${s.description}<br/>⭐ ${s.rating}`);
    });

    // Restaurants
    restaurants.forEach(r => {
      L.marker([toCoord(r.lat), toCoord(r.lng)], { icon: createIcon('#E91E63', '🍽️') })
        .addTo(map)
        .bindPopup(`<b>${r.name}</b><br/>${r.cuisine} · ${r.priceRange}<br/>⭐ ${r.rating}`);
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

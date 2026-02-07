'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useTrackingStore } from '@/stores';
import type { DriverLocation } from '@/types';

// Fix Leaflet default icon issue with Next.js
const createDriverIcon = (status: string) => {
  const colors = {
    online: '#22c55e',
    busy: '#f59e0b',
    offline: '#9ca3af',
  };
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${colors[status as keyof typeof colors] || colors.offline};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const clientIcon = L.divIcon({
  className: 'custom-client-marker',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background: #3b82f6;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface TrackingMapProps {
  drivers?: DriverLocation[];
  clients?: { id: string; name: string; lat: number; lng: number }[];
  selectedDriver?: string | null;
  onDriverSelect?: (id: string) => void;
  showRoute?: boolean;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export function TrackingMap({
  drivers = [],
  clients = [],
  selectedDriver,
  onDriverSelect,
  showRoute = false,
  center = [48.8566, 2.3522], // Paris default
  zoom = 13,
  height = '500px',
}: TrackingMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Fetch route from OSRM (free routing service)
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
        setRouteCoordinates(coords);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Get selected driver's route if showRoute is enabled
  useEffect(() => {
    if (showRoute && selectedDriver && clients.length > 0) {
      const driver = drivers.find(d => d.id === selectedDriver);
      if (driver) {
        const nextClient = clients[0]; // Get first client as destination
        fetchRoute([driver.lat, driver.lng], [nextClient.lat, nextClient.lng]);
      }
    }
  }, [selectedDriver, showRoute, drivers, clients]);

  return (
    <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden border border-border">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* OpenStreetMap tiles - FREE */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Alternative: CartoDB tiles for a cleaner look - also FREE */}
        {/* 
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        */}

        {/* Driver markers */}
        {drivers.map((driver) => (
          <Marker
            key={driver.id}
            position={[driver.lat, driver.lng]}
            icon={createDriverIcon(driver.status)}
            eventHandlers={{
              click: () => onDriverSelect?.(driver.id),
            }}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold">Livreur #{driver.id}</p>
                <p className="text-sm text-gray-600">
                  {driver.speed ? `Vitesse: ${driver.speed} km/h` : 'À l\'arrêt'}
                </p>
                <p className="text-xs text-gray-500">
                  Statut: {driver.status === 'online' ? 'En ligne' : 
                           driver.status === 'busy' ? 'En livraison' : 'Hors ligne'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Client markers */}
        {clients.map((client) => (
          <Marker
            key={client.id}
            position={[client.lat, client.lng]}
            icon={clientIcon}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold">{client.name}</p>
                <p className="text-sm text-gray-600">Point de livraison</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

// Hook for real-time driver tracking with Firebase Realtime DB
export function useDriverTracking() {
  const { drivers, updateDriver, setTracking } = useTrackingStore();
  
  useEffect(() => {
    // Import Firebase Realtime Database dynamically
    const setupTracking = async () => {
      const { realtimeDb } = await import('@/lib/firebase');
      const { ref, onValue, off } = await import('firebase/database');
      
      const locationsRef = ref(realtimeDb, 'locations');

      onValue(locationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([id, location]) => {
            updateDriver(id, location as DriverLocation);
          });
        }
        setTracking(true);
      });

      return () => {
        off(locationsRef);
        setTracking(false);
      };
    };

    setupTracking();
  }, [updateDriver, setTracking]);

  return { drivers: Object.values(drivers) };
}

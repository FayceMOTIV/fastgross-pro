'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Map,
  Navigation,
  RefreshCw,
  Locate,
  CheckCircle2,
  Clock,
  Truck,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getDeliveries,
  DeliveryStop,
  DELIVERY_STATUS_LABELS,
  openInMaps,
  openInWaze,
} from '@/services/livreur-service';

// Import Leaflet dynamically to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

export default function LivreurMapPage() {
  const [deliveries, setDeliveries] = useState<DeliveryStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryStop | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadDeliveries();
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to Marseille center if geolocation fails
          setDriverLocation({ lat: 43.2965, lng: 5.3698 });
        }
      );
    }
  }, []);

  useEffect(() => {
    // Load Leaflet CSS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('leaflet/dist/leaflet.css');
    setMapReady(true);
  }, []);

  const loadDeliveries = async () => {
    setIsLoading(true);
    try {
      const data = await getDeliveries('driver-1');
      setDeliveries(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (driverLocation) return driverLocation;
    if (deliveries.length > 0) {
      const lats = deliveries.map(d => d.client.location.lat);
      const lngs = deliveries.map(d => d.client.location.lng);
      return {
        lat: (Math.max(...lats) + Math.min(...lats)) / 2,
        lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
      };
    }
    return { lat: 43.2965, lng: 5.3698 }; // Marseille
  }, [deliveries, driverLocation]);

  // Route coordinates (simplified - in real app would use OSRM)
  const routeCoordinates = useMemo(() => {
    const pending = deliveries
      .filter(d => d.status !== 'delivered' && d.status !== 'failed')
      .sort((a, b) => a.sequence - b.sequence);

    const coords: [number, number][] = [];

    if (driverLocation) {
      coords.push([driverLocation.lat, driverLocation.lng]);
    }

    pending.forEach(d => {
      coords.push([d.client.location.lat, d.client.location.lng]);
    });

    return coords;
  }, [deliveries, driverLocation]);

  // Stats
  const stats = useMemo(() => {
    const completed = deliveries.filter(d => d.status === 'delivered').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    const inProgress = deliveries.filter(d => d.status === 'in_progress').length;
    const remaining = deliveries.length - completed - failed;

    return { completed, failed, inProgress, remaining, total: deliveries.length };
  }, [deliveries]);

  // Next delivery
  const nextDelivery = useMemo(() => {
    return deliveries.find(d => d.status === 'in_progress') ||
           deliveries.find(d => d.status === 'pending');
  }, [deliveries]);

  // Create custom icons
  const createIcon = (color: string, label: string) => {
    if (typeof window === 'undefined') return undefined;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${color};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${label}</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const driverIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');

    return L.divIcon({
      className: 'driver-marker',
      html: `
        <div style="
          background: #2563eb;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        ">🚚</div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, []);

  const getMarkerColor = (status: DeliveryStop['status']) => {
    switch (status) {
      case 'delivered': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'in_progress': return '#3b82f6';
      case 'arrived': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  if (isLoading || !mapReady) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-[60vh] bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="font-semibold flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mon itinéraire
          </h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadDeliveries}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (driverLocation) {
                  // Would center map on driver location
                }
              }}
            >
              <Locate className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '50vh' }}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}

          {/* Driver marker */}
          {driverLocation && driverIcon && (
            <Marker
              position={[driverLocation.lat, driverLocation.lng]}
              icon={driverIcon}
            >
              <Popup>Ma position</Popup>
            </Marker>
          )}

          {/* Delivery markers */}
          {deliveries.map((delivery) => {
            const icon = createIcon(
              getMarkerColor(delivery.status),
              delivery.status === 'delivered' ? '✓' :
              delivery.status === 'failed' ? '✗' :
              delivery.sequence.toString()
            );

            return (
              <Marker
                key={delivery.id}
                position={[delivery.client.location.lat, delivery.client.location.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => setSelectedDelivery(delivery),
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-medium">{delivery.client.name}</p>
                    <p className="text-xs text-gray-500">{delivery.client.address}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Selected delivery panel */}
      {selectedDelivery && (
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{selectedDelivery.client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDelivery.client.address}
                  </p>
                </div>
                <Badge className={cn(
                  DELIVERY_STATUS_LABELS[selectedDelivery.status].bgColor,
                  DELIVERY_STATUS_LABELS[selectedDelivery.status].color,
                  'border-0'
                )}>
                  {DELIVERY_STATUS_LABELS[selectedDelivery.status].icon}
                </Badge>
              </div>

              {selectedDelivery.status !== 'delivered' && selectedDelivery.status !== 'failed' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    className="h-12"
                    onClick={() => openInMaps(
                      selectedDelivery.client.location,
                      `${selectedDelivery.client.address}, ${selectedDelivery.client.postalCode} ${selectedDelivery.client.city}`
                    )}
                  >
                    <Navigation className="h-5 w-5 mr-2" />
                    Naviguer
                  </Button>
                  <Link href={`/livreur/${selectedDelivery.id}`}>
                    <Button variant="outline" size="lg" className="h-12 w-full">
                      Détails
                    </Button>
                  </Link>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground"
                onClick={() => setSelectedDelivery(null)}
              >
                Fermer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary panel */}
      <div className="border-t bg-background">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full flex items-center justify-center py-2 text-muted-foreground"
        >
          {showSummary ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>

        {showSummary && (
          <div className="px-4 pb-4 space-y-4">
            {/* Next delivery */}
            {nextDelivery && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Prochain arrêt</p>
                  <p className="font-medium">{nextDelivery.client.name}</p>
                  {nextDelivery.estimatedArrival && (
                    <p className="text-sm text-muted-foreground">
                      Arrivée prévue:{' '}
                      {new Date(nextDelivery.estimatedArrival).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => openInMaps(
                    nextDelivery.client.location,
                    `${nextDelivery.client.address}, ${nextDelivery.client.postalCode} ${nextDelivery.client.city}`
                  )}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Go
                </Button>
              </div>
            )}

            {/* Navigation options */}
            {nextDelivery && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInMaps(
                    nextDelivery.client.location,
                    `${nextDelivery.client.address}, ${nextDelivery.client.postalCode} ${nextDelivery.client.city}`
                  )}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Google Maps
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInWaze(nextDelivery.client.location)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Waze
                </Button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-bold">{stats.completed}</span>
                </div>
                <p className="text-xs text-muted-foreground">Livrées</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <Truck className="h-4 w-4" />
                  <span className="font-bold">{stats.inProgress}</span>
                </div>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-bold">{stats.remaining}</span>
                </div>
                <p className="text-xs text-muted-foreground">Restantes</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Distance et durée (mock) */}
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <span>📏 18km restants</span>
              <span>•</span>
              <span>⏱️ ~1h45</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

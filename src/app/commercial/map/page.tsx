'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Filter,
  Navigation,
  MapPin,
  Phone,
  AlertTriangle,
  Clock,
  ChevronRight,
  Loader2,
  Route,
  Target,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getMyClients,
  getMyProspects,
  optimizeRoute,
  CommercialClient,
  OptimizedRoute,
} from '@/services/commercial-service';

// Import dynamique de la carte pour éviter les erreurs SSR
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

// Définir les icônes Leaflet côté client
const createIcon = (color: string) => {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet');
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface Filters {
  showActive: boolean;
  showAtRisk: boolean;
  showInactive: boolean;
  showProspects: boolean;
}

export default function CommercialMapPage() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [filters, setFilters] = useState<Filters>({
    showActive: true,
    showAtRisk: true,
    showInactive: false,
    showProspects: true,
  });
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Position par défaut (Marseille)
  const defaultCenter = { lat: 43.2965, lng: 5.3698 };

  useEffect(() => {
    setMounted(true);

    // Obtenir la position de l'utilisateur
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Utiliser position par défaut si refusé
          setUserLocation(defaultCenter);
        }
      );
    }
  }, []);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, prospectsData] = await Promise.all([
          getMyClients(user?.id || 'commercial-1'),
          getMyProspects(user?.id || 'commercial-1'),
        ]);
        setClients(clientsData);
        setProspects(prospectsData);
      } catch (error) {
        console.error('Erreur chargement données:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  // Filtrer les points à afficher
  const visiblePoints = useMemo(() => {
    const points: any[] = [];

    clients.forEach((client) => {
      if (
        (client.status === 'active' && filters.showActive) ||
        (client.status === 'at_risk' && filters.showAtRisk) ||
        (client.status === 'inactive' && filters.showInactive)
      ) {
        if (client.address.lat && client.address.lng) {
          points.push({
            id: client.id,
            type: 'client',
            name: client.name,
            status: client.status,
            lat: client.address.lat,
            lng: client.address.lng,
            alerts: client.alerts,
            lastOrder: client.daysSinceLastOrder,
            priceGrid: client.priceGrid,
            phone: client.contact.phone,
          });
        }
      }
    });

    if (filters.showProspects) {
      prospects.forEach((prospect) => {
        if (prospect.address.lat && prospect.address.lng) {
          points.push({
            id: prospect.id,
            type: 'prospect',
            name: prospect.name,
            status: 'prospect',
            lat: prospect.address.lat,
            lng: prospect.address.lng,
            score: prospect.score,
            phone: prospect.phone,
            distance: prospect.distance,
          });
        }
      });
    }

    return points;
  }, [clients, prospects, filters]);

  // Points à proximité
  const nearbyPoints = useMemo(() => {
    if (!userLocation) return [];
    return visiblePoints
      .map((p) => ({
        ...p,
        distance: calculateDistance(userLocation, { lat: p.lat, lng: p.lng }),
      }))
      .filter((p) => p.distance < 1000) // 1km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [visiblePoints, userLocation]);

  // Optimiser la tournée
  const handleOptimizeRoute = async () => {
    if (!userLocation || selectedForRoute.length === 0) return;

    setIsOptimizing(true);
    try {
      const stops = visiblePoints
        .filter((p) => selectedForRoute.includes(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          type: p.type as 'client' | 'prospect',
        }));

      const route = await optimizeRoute(userLocation, stops);
      setOptimizedRoute(route);
    } catch (error) {
      console.error('Erreur optimisation:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Toggle sélection pour tournée
  const toggleRouteSelection = (id: string) => {
    setSelectedForRoute((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  if (!mounted || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      {/* Header avec filtres */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur border-b p-3">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ma Zone
          </h1>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtres
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtres carte</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <FilterCheckbox
                    label="Clients actifs"
                    color="bg-green-500"
                    checked={filters.showActive}
                    onChange={(c) => setFilters({ ...filters, showActive: c })}
                  />
                  <FilterCheckbox
                    label="Clients à risque"
                    color="bg-orange-500"
                    checked={filters.showAtRisk}
                    onChange={(c) => setFilters({ ...filters, showAtRisk: c })}
                  />
                  <FilterCheckbox
                    label="Clients inactifs"
                    color="bg-red-500"
                    checked={filters.showInactive}
                    onChange={(c) => setFilters({ ...filters, showInactive: c })}
                  />
                  <FilterCheckbox
                    label="Prospects"
                    color="bg-blue-500"
                    checked={filters.showProspects}
                    onChange={(c) => setFilters({ ...filters, showProspects: c })}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRouteOptimizer(!showRouteOptimizer)}
              >
                <Route className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Actif
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            À risque
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Inactif
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Prospect
          </span>
        </div>
      </div>

      {/* Carte */}
      <div className="h-full pt-24">
        <MapContainer
          center={userLocation || defaultCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Ma position */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createIcon('#6366f1')}
            >
              <Popup>Ma position</Popup>
            </Marker>
          )}

          {/* Points sur la carte */}
          {visiblePoints.map((point) => {
            const color =
              point.type === 'prospect'
                ? '#3b82f6'
                : point.status === 'active'
                ? '#22c55e'
                : point.status === 'at_risk'
                ? '#f97316'
                : '#ef4444';

            return (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]}
                icon={createIcon(color)}
                eventHandlers={{
                  click: () => setSelectedPoint(point),
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Panel points à proximité */}
      {nearbyPoints.length > 0 && !showRouteOptimizer && !selectedPoint && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] p-4">
          <Card>
            <CardContent className="p-3">
              <h3 className="text-sm font-medium mb-2">À proximité</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {nearbyPoints.map((point) => (
                  <button
                    key={point.id}
                    onClick={() => setSelectedPoint(point)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          point.type === 'prospect' && 'bg-blue-500',
                          point.status === 'active' && 'bg-green-500',
                          point.status === 'at_risk' && 'bg-orange-500',
                          point.status === 'inactive' && 'bg-red-500'
                        )}
                      />
                      <div className="text-left">
                        <div className="text-sm font-medium">{point.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {point.type === 'prospect'
                            ? `Score ${point.score}`
                            : point.alerts?.length > 0
                            ? 'Alerte'
                            : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(point.distance)}m
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panel point sélectionné */}
      {selectedPoint && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] p-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{selectedPoint.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPoint.type === 'prospect'
                      ? `Prospect • Score ${selectedPoint.score}`
                      : `Client ${selectedPoint.priceGrid}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPoint(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedPoint.alerts?.length > 0 && (
                <div className="flex items-center gap-1 text-orange-600 text-sm mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  {selectedPoint.alerts[0].title}
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href={
                    selectedPoint.type === 'client'
                      ? `/commercial/clients/${selectedPoint.id}`
                      : `/commercial/prospects/${selectedPoint.id}`
                  }
                  className="flex-1"
                >
                  <Button className="w-full" size="sm">
                    Voir fiche
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <a href={`tel:${selectedPoint.phone}`}>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
                <a
                  href={`https://maps.google.com/maps?daddr=${selectedPoint.lat},${selectedPoint.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panel optimisation tournée */}
      {showRouteOptimizer && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] p-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Optimiser ma tournée
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowRouteOptimizer(false);
                    setOptimizedRoute(null);
                    setSelectedForRoute([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!optimizedRoute ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sélectionnez les clients à visiter :
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {visiblePoints
                      .filter((p) => p.type === 'client')
                      .map((point) => (
                        <label
                          key={point.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedForRoute.includes(point.id)}
                            onCheckedChange={() => toggleRouteSelection(point.id)}
                          />
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              point.status === 'active' && 'bg-green-500',
                              point.status === 'at_risk' && 'bg-orange-500',
                              point.status === 'inactive' && 'bg-red-500'
                            )}
                          />
                          <span className="text-sm">{point.name}</span>
                        </label>
                      ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleOptimizeRoute}
                    disabled={selectedForRoute.length === 0 || isOptimizing}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Optimiser ({selectedForRoute.length} clients)
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {optimizedRoute.orderedStops.map((stop, index) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{stop.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {stop.durationFromPrev}min • {stop.distanceFromPrev?.toFixed(1)}km
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3 p-2 bg-green-50 rounded-lg">
                    <span>
                      {optimizedRoute.totalDistance.toFixed(1)}km •{' '}
                      {optimizedRoute.totalDuration}min
                    </span>
                    <span className="text-green-600 font-medium">
                      -{optimizedRoute.savings.percentSaved}% vs manuel
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/${userLocation?.lat},${userLocation?.lng}/${optimizedRoute.orderedStops.map((s) => `${s.lat},${s.lng}`).join('/')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full">
                      <Navigation className="h-4 w-4 mr-2" />
                      Lancer dans Maps
                    </Button>
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Composant filtre checkbox
function FilterCheckbox({
  label,
  color,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className={cn('w-3 h-3 rounded-full', color)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// Calculer la distance entre deux points
function calculateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Rayon de la terre en mètres
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

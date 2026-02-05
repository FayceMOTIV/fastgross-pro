'use client';

/**
 * Carte Google Maps pour le tracking des livraisons
 * Utilise le chargement dynamique du script Google Maps
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Truck, MapPin, Package, RefreshCw, Locate } from 'lucide-react';

// Déclaration globale pour TypeScript
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

// ============================================
// TYPES
// ============================================

export interface Delivery {
  id: string;
  clientName: string;
  clientAddress: string;
  lat: number;
  lng: number;
  status: 'pending' | 'in-transit' | 'delivered' | 'failed';
  orderNumber: string;
  eta?: string;
  priority?: 'normale' | 'urgente';
}

export interface Driver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'online' | 'busy' | 'offline';
  phone?: string;
  vehicleType?: string;
}

interface DeliveryMapGoogleProps {
  deliveries?: Delivery[];
  drivers?: Driver[];
  depot?: { lat: number; lng: number; name: string };
  onDeliverySelect?: (delivery: Delivery) => void;
  onDriverSelect?: (driver: Driver) => void;
  showRoute?: boolean;
  height?: string;
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Centres des dépôts
const DEPOT_CENTERS = {
  lyon: { lat: 45.764, lng: 4.8357, name: 'Dépôt Lyon' },
  montpellier: { lat: 43.6108, lng: 3.8767, name: 'Dépôt Montpellier' },
  bordeaux: { lat: 44.8378, lng: -0.5792, name: 'Dépôt Bordeaux' },
};

const STATUS_COLORS = {
  pending: '#f59e0b',     // amber
  'in-transit': '#3b82f6', // blue
  delivered: '#22c55e',   // green
  failed: '#ef4444',      // red
};

const DRIVER_STATUS_COLORS = {
  online: '#22c55e',
  busy: '#f59e0b',
  offline: '#9ca3af',
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function DeliveryMapGoogle({
  deliveries = [],
  drivers = [],
  depot = DEPOT_CENTERS.lyon,
  onDeliverySelect,
  onDriverSelect,
  showRoute = false,
  height = '500px',
  className = '',
}: DeliveryMapGoogleProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Charger Google Maps via script dynamique
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Clé Google Maps non configurée');
      setIsLoading(false);
      return;
    }

    // Vérifier si Google Maps est déjà chargé
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Callback global pour l'initialisation
    window.initGoogleMaps = () => {
      initializeMap();
    };

    // Charger le script Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setError('Erreur lors du chargement de Google Maps');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    function initializeMap() {
      if (!mapRef.current || !window.google?.maps) return;

      try {
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: depot.lat, lng: depot.lng },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMap(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Erreur initialisation carte:', err);
        setError('Erreur lors du chargement de la carte');
        setIsLoading(false);
      }
    }

    return () => {
      // Cleanup
      delete window.initGoogleMaps;
    };
  }, [depot]);

  // Mettre à jour les marqueurs
  useEffect(() => {
    if (!map) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Ajouter le marqueur du dépôt
    const depotMarker = new google.maps.Marker({
      position: { lat: depot.lat, lng: depot.lng },
      map,
      title: depot.name || 'Dépôt DISTRAM',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#ea580c',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 12,
      },
      zIndex: 100,
    });
    markersRef.current.push(depotMarker);

    // Ajouter les marqueurs des livraisons
    deliveries.forEach((delivery) => {
      const marker = new google.maps.Marker({
        position: { lat: delivery.lat, lng: delivery.lng },
        map,
        title: delivery.clientName,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: STATUS_COLORS[delivery.status],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
        zIndex: delivery.status === 'in-transit' ? 90 : 50,
      });

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">${delivery.clientName}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">${delivery.clientAddress}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;">
              <strong>Commande:</strong> ${delivery.orderNumber}
            </p>
            ${delivery.eta ? `<p style="margin: 0; font-size: 12px;"><strong>ETA:</strong> ${delivery.eta}</p>` : ''}
            <span style="
              display: inline-block;
              margin-top: 8px;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              background: ${STATUS_COLORS[delivery.status]}20;
              color: ${STATUS_COLORS[delivery.status]};
            ">
              ${getStatusLabel(delivery.status)}
            </span>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        onDeliverySelect?.(delivery);
      });

      markersRef.current.push(marker);
    });

    // Ajouter les marqueurs des livreurs
    drivers.forEach((driver) => {
      const marker = new google.maps.Marker({
        position: { lat: driver.lat, lng: driver.lng },
        map,
        title: driver.name,
        icon: {
          url: createTruckIcon(DRIVER_STATUS_COLORS[driver.status]),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        zIndex: 80,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 180px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">🚚 ${driver.name}</h3>
            ${driver.phone ? `<p style="margin: 0 0 4px 0; font-size: 13px;">📞 ${driver.phone}</p>` : ''}
            <span style="
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              background: ${DRIVER_STATUS_COLORS[driver.status]}20;
              color: ${DRIVER_STATUS_COLORS[driver.status]};
            ">
              ${driver.status === 'online' ? 'Disponible' : driver.status === 'busy' ? 'En livraison' : 'Hors ligne'}
            </span>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        onDriverSelect?.(driver);
      });

      markersRef.current.push(marker);
    });

    // Ajuster la vue pour montrer tous les marqueurs
    if (deliveries.length > 0 || drivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: depot.lat, lng: depot.lng });
      deliveries.forEach((d) => bounds.extend({ lat: d.lat, lng: d.lng }));
      drivers.forEach((d) => bounds.extend({ lat: d.lat, lng: d.lng }));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [map, deliveries, drivers, depot, onDeliverySelect, onDriverSelect]);

  // Afficher l'itinéraire
  const showDirections = useCallback(async () => {
    if (!map || !showRoute || deliveries.length === 0) return;

    // Créer le renderer si nécessaire
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#ea580c',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });
    }

    const directionsService = new google.maps.DirectionsService();

    // Livraisons en attente ou en transit
    const activeDeliveries = deliveries.filter(
      (d) => d.status === 'pending' || d.status === 'in-transit'
    );

    if (activeDeliveries.length === 0) return;

    // Créer les waypoints
    const waypoints = activeDeliveries.slice(0, -1).map((d) => ({
      location: { lat: d.lat, lng: d.lng },
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: { lat: depot.lat, lng: depot.lng },
      destination: {
        lat: activeDeliveries[activeDeliveries.length - 1].lat,
        lng: activeDeliveries[activeDeliveries.length - 1].lng,
      },
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        directionsRendererRef.current?.setDirections(result);
      }
    });
  }, [map, showRoute, deliveries, depot]);

  useEffect(() => {
    showDirections();
  }, [showDirections]);

  // Centrer sur la position actuelle
  const centerOnCurrentLocation = () => {
    if (!map || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        map.setZoom(15);
      },
      (err) => console.error('Erreur géolocalisation:', err)
    );
  };

  // Rafraîchir la carte
  const refreshMap = () => {
    if (map) {
      map.setCenter({ lat: depot.lat, lng: depot.lng });
      map.setZoom(12);
    }
  };

  // Affichage erreur ou chargement
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-400 mt-1">
            Configurez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Carte */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      )}

      {/* Contrôles */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={refreshMap}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={centerOnCurrentLocation}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Ma position"
        >
          <Locate className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Légende</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.pending }}
            />
            <span>En attente</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS['in-transit'] }}
            />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.delivered }}
            />
            <span>Livrée</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Truck className="w-3 h-3 text-green-500" />
            <span>Livreur</span>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">{deliveries.length}</span>
        </div>
        <div className="bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2">
          <Truck className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">
            {drivers.filter((d) => d.status !== 'offline').length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function getStatusLabel(status: Delivery['status']): string {
  const labels = {
    pending: 'En attente',
    'in-transit': 'En cours',
    delivered: 'Livrée',
    failed: 'Échec',
  };
  return labels[status];
}

function createTruckIcon(color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
      <path d="M27 24h-1v-3l-3-4h-3v7h-8v-7c0-1.1.9-2 2-2h10l4 5.33V24h-1z" fill="white" transform="translate(4,4)"/>
      <circle cx="14" cy="26" r="2" fill="white"/>
      <circle cx="26" cy="26" r="2" fill="white"/>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

export default DeliveryMapGoogle;

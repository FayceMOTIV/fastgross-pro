'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Package,
  Check,
  Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getOrderDetails,
  trackDelivery,
  ClientOrder,
  DeliveryTracking,
  ORDER_STATUS_LABELS,
  reorder,
} from '@/services/client-portal-service';

// Dynamic import for map
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

export default function OrderDetailClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('leaflet/dist/leaflet.css');
    setMapReady(true);
  }, [orderId]);

  const loadOrder = async () => {
    setIsLoading(true);
    try {
      const [orderData, trackingData] = await Promise.all([
        getOrderDetails('client-1', orderId),
        trackDelivery(orderId),
      ]);
      setOrder(orderData);
      setTracking(trackingData);
    } catch (error) {
      console.error('Erreur chargement commande:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    try {
      await reorder('client-1', order.id);
      router.push('/portail/panier');
    } catch (error) {
      console.error('Erreur recommande:', error);
    }
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProductIcon = (category: string) => {
    const icons: Record<string, string> = {
      huiles: '🛢️',
      surgeles: '🍟',
      fromages: '🧀',
      sauces: '🥫',
      viandes: '🥩',
      pains: '🍞',
      boissons: '🥤',
      emballages: '📦',
    };
    return icons[category] || '📦';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Commande introuvable</p>
          <Link href="/portail/commandes">
            <Button>Retour aux commandes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_LABELS[order.status];
  const isDelivering = order.status === 'delivering';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-2">
          <Link href="/portail/commandes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold">{order.number}</h1>
            <Badge
              className={cn(
                order.status === 'delivered' && 'bg-green-100 text-green-700',
                order.status === 'delivering' && 'bg-blue-100 text-blue-700',
                !['delivered', 'delivering'].includes(order.status) && 'bg-gray-100 text-gray-700'
              )}
            >
              {statusInfo.icon} {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Live Tracking Map */}
        {isDelivering && tracking?.driverLocation && mapReady && (
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <div className="h-48 relative">
                <MapContainer
                  center={[tracking.driverLocation.lat, tracking.driverLocation.lng]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </MapContainer>
              </div>

              <div className="p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-700">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Arrivée estimée: {tracking.eta ? new Date(tracking.eta).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                    <p className="text-sm text-blue-600">
                      Livreur: {tracking.driverName}
                    </p>
                  </div>
                  {tracking.driverPhone && (
                    <a href={`tel:${tracking.driverPhone}`}>
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-1" />
                        Appeler
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {tracking && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tracking.timeline.map((step, index) => (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {step.completed ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : step.status === order.status ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Circle className="h-3 w-3 text-white fill-white animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                      )}
                      {index < tracking.timeline.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-8 mt-1',
                          step.completed ? 'bg-green-500' : 'bg-gray-200'
                        )} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className={cn(
                        'font-medium',
                        step.completed ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {step.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {step.timestamp ? formatDateTime(step.timestamp) : '--:--'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détail commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span>{getProductIcon(item.product.category)}</span>
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.unitPrice.toFixed(2)}€ × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-medium">{item.totalPrice.toFixed(2)}€</span>
              </div>
            ))}

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{order.subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Remise</span>
                <span>-{order.discount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA</span>
                <span>{order.tva.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total TTC</span>
                <span>{order.totalTTC.toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Livraison</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.deliveryDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {' • '}
                  {order.deliverySlot}
                </p>
                {order.deliveryNotes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Notes: {order.deliveryNotes}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reorder Button */}
        {isDelivered && (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleReorder}
          >
            Recommander cette commande
          </Button>
        )}
      </div>
    </div>
  );
}

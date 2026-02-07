'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  MapPin,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getOrders,
  reorder,
  ClientOrder,
  ORDER_STATUS_LABELS,
} from '@/services/client-portal-service';

type Filter = 'all' | 'pending' | 'delivered';

function CommandesContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as Filter) || 'all';

  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [isLoading, setIsLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await getOrders('client-1', filter);
      setOrders(data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      await reorder('client-1', orderId);
      // Redirect to cart
      window.location.href = '/portail/panier';
    } catch (error) {
      console.error('Erreur recommande:', error);
      setReorderingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'En cours' },
    { value: 'delivered', label: 'Livrées' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Mes Commandes
          </h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-4">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          orders.map((order) => {
            const statusInfo = ORDER_STATUS_LABELS[order.status];
            const isDelivering = order.status === 'delivering';
            const isDelivered = order.status === 'delivered';

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold">{order.number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.date)} • {order.totalTTC.toFixed(2)}€
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'shrink-0',
                        order.status === 'delivered' && 'bg-green-100 text-green-700',
                        order.status === 'delivering' && 'bg-blue-100 text-blue-700',
                        order.status === 'cancelled' && 'bg-red-100 text-red-700',
                        !['delivered', 'delivering', 'cancelled'].includes(order.status) && 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </div>

                  {/* ETA for delivering orders */}
                  {isDelivering && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">En livraison</span>
                        <br />
                        Arrivée estimée: 14h30 (~25 min)
                      </p>
                    </div>
                  )}

                  {/* Delivered info */}
                  {isDelivered && order.deliveredAt && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Livrée le {formatDate(order.deliveredAt)} à {formatTime(order.deliveredAt)}
                      {order.deliveredBy && ` par ${order.deliveredBy}`}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isDelivering && (
                      <Link href={`/portail/commandes/${order.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          <MapPin className="h-4 w-4 mr-1" />
                          Suivre
                        </Button>
                      </Link>
                    )}

                    {isDelivered && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleReorder(order.id)}
                        disabled={reorderingId === order.id}
                      >
                        <RefreshCw className={cn(
                          'h-4 w-4 mr-1',
                          reorderingId === order.id && 'animate-spin'
                        )} />
                        Recommander
                      </Button>
                    )}

                    <Link href={`/portail/commandes/${order.id}`}>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CommandesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="p-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mes Commandes
            </h1>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    }>
      <CommandesContent />
    </Suspense>
  );
}

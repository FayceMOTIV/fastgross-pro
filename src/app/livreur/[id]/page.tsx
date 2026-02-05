'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Phone,
  Navigation,
  FileText,
  Package,
  Euro,
  CreditCard,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getDeliveryDetail,
  DeliveryStop,
  PAYMENT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  openInMaps,
  openInWaze,
  callClient,
  startDelivery,
  arriveAtDelivery,
} from '@/services/livreur-service';
import { DeliveryValidation } from '@/components/livreur/delivery-validation';
import { DeliveryProblem } from '@/components/livreur/delivery-problem';

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deliveryId = params.id as string;

  const [delivery, setDelivery] = useState<DeliveryStop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [showProblem, setShowProblem] = useState(false);

  useEffect(() => {
    loadDelivery();
  }, [deliveryId]);

  const loadDelivery = async () => {
    setIsLoading(true);
    try {
      const data = await getDeliveryDetail(deliveryId);
      setDelivery(data);
    } catch (error) {
      console.error('Erreur chargement livraison:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    if (!delivery) return;
    try {
      await startDelivery(deliveryId);
      setDelivery(prev => prev ? { ...prev, status: 'in_progress' } : null);
    } catch (error) {
      console.error('Erreur démarrage livraison:', error);
    }
  };

  const handleArrived = async () => {
    if (!delivery) return;
    try {
      await arriveAtDelivery(deliveryId);
      setDelivery(prev => prev ? { ...prev, status: 'arrived', actualArrival: new Date() } : null);
    } catch (error) {
      console.error('Erreur arrivée:', error);
    }
  };

  const handleValidationComplete = () => {
    setShowValidation(false);
    router.push('/livreur');
  };

  const handleProblemReported = () => {
    setShowProblem(false);
    router.push('/livreur');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Livraison introuvable</p>
          <Button onClick={() => router.push('/livreur')}>Retour</Button>
        </div>
      </div>
    );
  }

  // Show validation modal
  if (showValidation) {
    return (
      <DeliveryValidation
        delivery={delivery}
        onComplete={handleValidationComplete}
        onCancel={() => setShowValidation(false)}
      />
    );
  }

  // Show problem modal
  if (showProblem) {
    return (
      <DeliveryProblem
        delivery={delivery}
        onComplete={handleProblemReported}
        onCancel={() => setShowProblem(false)}
      />
    );
  }

  const paymentInfo = PAYMENT_STATUS_LABELS[delivery.paymentStatus];
  const statusInfo = DELIVERY_STATUS_LABELS[delivery.status];
  const isCompleted = delivery.status === 'delivered' || delivery.status === 'failed';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/livreur')}
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          {!isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600"
              onClick={() => setShowProblem(true)}
            >
              <AlertTriangle className="h-5 w-5 mr-1" />
              Signaler
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Titre et statut */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {delivery.client.name.includes('Burger') ? '🍔' :
               delivery.client.name.includes('Pizza') ? '🍕' :
               delivery.client.name.includes('Kebab') ? '🥙' :
               delivery.client.name.includes('Chicken') ? '🍗' :
               delivery.client.name.includes('Sushi') ? '🍣' :
               delivery.client.name.includes('Tacos') ? '🌮' :
               delivery.client.name.includes('Pasta') ? '🍝' : '🏪'}
            </span>
            <div>
              <h1 className="text-xl font-bold">{delivery.client.name}</h1>
              <p className="text-sm text-muted-foreground">
                Livraison #{delivery.sequence} sur 8
              </p>
            </div>
          </div>

          <Badge className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
            {statusInfo.icon} {statusInfo.label}
          </Badge>
        </div>

        {/* Infos client */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Adresse */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{delivery.client.address}</p>
                <p className="text-sm text-muted-foreground">
                  {delivery.client.postalCode} {delivery.client.city}
                </p>
              </div>
            </div>

            {/* Téléphone */}
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">{delivery.client.phone}</p>
            </div>

            {/* Notes */}
            {delivery.client.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {delivery.client.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Boutons GPS et Appel */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={() => openInMaps(
                  delivery.client.location,
                  `${delivery.client.address}, ${delivery.client.postalCode} ${delivery.client.city}`
                )}
              >
                <Navigation className="h-5 w-5 mr-2" />
                GPS
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={() => callClient(delivery.client.phone)}
              >
                <Phone className="h-5 w-5 mr-2" />
                Appeler
              </Button>
            </div>

            {/* Options navigation */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="link"
                size="sm"
                className="text-xs"
                onClick={() => openInMaps(
                  delivery.client.location,
                  `${delivery.client.address}, ${delivery.client.postalCode} ${delivery.client.city}`
                )}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Google Maps
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-xs"
                onClick={() => openInWaze(delivery.client.location)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Waze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commande */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Commande {delivery.orderId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Liste produits */}
            <div className="space-y-2">
              {delivery.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium">
                    x{item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Total</span>
              </div>
              <span className="text-xl font-bold">
                {delivery.totalAmount.toLocaleString('fr-FR')}€
              </span>
            </div>

            {/* Statut paiement */}
            <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Paiement</span>
              </div>
              <span className={cn('font-medium', paymentInfo.color)}>
                {paymentInfo.icon} {paymentInfo.label}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Infos livraison terminée */}
        {isCompleted && (
          <Card className={cn(
            delivery.status === 'delivered' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {delivery.status === 'delivered' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <p className={cn(
                    'font-bold',
                    delivery.status === 'delivered' ? 'text-green-700' : 'text-red-700'
                  )}>
                    {delivery.status === 'delivered' ? 'Livraison effectuée' : 'Livraison échouée'}
                  </p>
                  {delivery.actualArrival && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(delivery.actualArrival).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {delivery.receiverName && (
                    <p className="text-sm text-muted-foreground">
                      Reçu par: {delivery.receiverName}
                    </p>
                  )}
                  {delivery.failReason && (
                    <p className="text-sm text-red-600 mt-1">
                      Raison: {delivery.failReason}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="space-y-3 pt-4">
            {delivery.status === 'pending' && (
              <Button
                size="lg"
                className="w-full h-16 text-lg"
                onClick={handleStartDelivery}
              >
                <Navigation className="h-6 w-6 mr-2" />
                Démarrer cette livraison
              </Button>
            )}

            {delivery.status === 'in_progress' && (
              <Button
                size="lg"
                className="w-full h-16 text-lg bg-amber-600 hover:bg-amber-700"
                onClick={handleArrived}
              >
                <MapPin className="h-6 w-6 mr-2" />
                Je suis arrivé
              </Button>
            )}

            {delivery.status === 'arrived' && (
              <>
                <Button
                  size="lg"
                  className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                  onClick={() => setShowValidation(true)}
                >
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  LIVRAISON EFFECTUÉE
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowProblem(true)}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  PROBLÈME / ÉCHEC
                </Button>
              </>
            )}

            {(delivery.status === 'pending' || delivery.status === 'in_progress') && (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowProblem(true)}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Signaler un problème
              </Button>
            )}
          </div>
        )}

        {/* Heure estimée */}
        {!isCompleted && delivery.estimatedArrival && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
            <Clock className="h-4 w-4" />
            <span>
              Arrivée prévue:{' '}
              {new Date(delivery.estimatedArrival).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

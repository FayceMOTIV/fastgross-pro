'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Lightbulb,
  Calendar,
  FileText,
  Check,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getQuickOrderData,
  createQuickOrder,
  UsualProduct,
  QuickOrderItem,
} from '@/services/commercial-service';
import { useAuthStore } from '@/stores';

interface OrderLine extends UsualProduct {
  quantity: number;
  promoApplied: boolean;
}

export default function QuickOrderClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const clientId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientDiscount, setClientDiscount] = useState(0);
  const [_usualProducts, setUsualProducts] = useState<UsualProduct[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<{ id: string; label: string }[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getQuickOrderData(clientId);
        setClientName(data.client?.name || 'Client');
        setClientDiscount(data.clientDiscount);
        setUsualProducts(data.usualProducts);
        setDeliverySlots(data.deliverySlots);
        setSelectedDeliverySlot(data.deliverySlots[0]?.id || '');
        setOrderLines(
          data.usualProducts.map((p) => ({
            ...p,
            quantity: 0,
            promoApplied: false,
          }))
        );
      } catch (error) {
        console.error('Erreur chargement données:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  const totals = useMemo(() => {
    const subtotal = orderLines.reduce((sum, line) => {
      if (line.quantity === 0) return sum;
      const price = line.promoApplied && line.availablePromo
        ? line.availablePromo.newPrice
        : line.unitPrice;
      return sum + price * line.quantity;
    }, 0);

    const discountAmount = subtotal * (clientDiscount / 100);
    const totalHT = subtotal - discountAmount;
    const tva = totalHT * 0.2;
    const totalTTC = totalHT + tva;
    const itemCount = orderLines.filter((l) => l.quantity > 0).length;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      totalHT: Math.round(totalHT * 100) / 100,
      tva: Math.round(tva * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
      itemCount,
    };
  }, [orderLines, clientDiscount]);

  const updateQuantity = (productId: string, delta: number) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === productId
          ? { ...line, quantity: Math.max(0, line.quantity + delta) }
          : line
      )
    );
  };

  const applyPromo = (productId: string) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === productId
          ? { ...line, promoApplied: true, quantity: line.quantity || 1 }
          : line
      )
    );
  };

  const handleSubmit = async () => {
    if (totals.itemCount === 0) return;

    setIsSubmitting(true);
    try {
      const items: QuickOrderItem[] = orderLines
        .filter((line) => line.quantity > 0)
        .map((line) => ({
          productId: line.id,
          productName: line.name,
          quantity: line.quantity,
          unitPrice: line.promoApplied && line.availablePromo
            ? line.availablePromo.newPrice
            : line.unitPrice,
          discount: line.promoApplied && line.availablePromo
            ? line.availablePromo.percent
            : 0,
          total:
            (line.promoApplied && line.availablePromo
              ? line.availablePromo.newPrice
              : line.unitPrice) * line.quantity,
          promoApplied: line.promoApplied ? 'Promo relance' : undefined,
        }));

      await createQuickOrder(clientId, user?.id || 'commercial-1', items, {
        deliverySlot: selectedDeliverySlot,
        notes: notes || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/commercial/clients/${clientId}`);
      }, 2000);
    } catch (error) {
      console.error('Erreur création commande:', error);
      alert('Erreur lors de la création de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = searchQuery
    ? orderLines.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orderLines;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Commande envoyée !</h2>
          <p className="text-muted-foreground">
            Total : {totals.totalTTC.toFixed(2)}€ TTC
          </p>
          <p className="text-sm text-muted-foreground mt-2">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-48">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{clientName}</span>
          </button>
          <h1 className="text-xl font-bold">Nouvelle commande</h1>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Produits habituels
        </h2>

        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className={cn(
              product.hasAlert && 'border-orange-200 bg-orange-50/30'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {getCategoryEmoji(product.category)} {product.name}
                    </span>
                    {product.hasAlert && (
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-300 text-[10px]"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Alerte
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {product.unit} • {product.frequency}
                  </div>
                </div>
                <div className="text-right">
                  {product.promoApplied && product.availablePromo ? (
                    <>
                      <div className="text-sm font-semibold text-green-600">
                        {product.availablePromo.newPrice.toFixed(2)}€
                      </div>
                      <div className="text-xs text-muted-foreground line-through">
                        {product.unitPrice.toFixed(2)}€
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-semibold">
                      {product.unitPrice.toFixed(2)}€
                    </div>
                  )}
                </div>
              </div>

              {product.hasAlert && !product.promoApplied && (
                <div className="bg-orange-100 rounded-lg p-2 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-orange-800">
                        {product.alertMessage}
                      </div>
                      {product.availablePromo && (
                        <button
                          onClick={() => applyPromo(product.id)}
                          className="flex items-center gap-1 text-xs text-orange-700 font-medium mt-1 hover:underline"
                        >
                          <Lightbulb className="h-3 w-3" />
                          Appliquer promo -{product.availablePromo.percent}% →{' '}
                          {product.availablePromo.newPrice.toFixed(2)}€
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {product.promoApplied && product.availablePromo && (
                <div className="bg-green-100 rounded-lg p-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <Check className="h-4 w-4" />
                    Promo -{product.availablePromo.percent}% appliquée
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => updateQuantity(product.id, -1)}
                    disabled={product.quantity === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold w-8 text-center">
                    {product.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => updateQuantity(product.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {product.quantity > 0 && (
                  <div className="text-sm font-semibold">
                    {(
                      (product.promoApplied && product.availablePromo
                        ? product.availablePromo.newPrice
                        : product.unitPrice) * product.quantity
                    ).toFixed(2)}
                    €
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Parcourir le catalogue
        </Button>
      </div>

      <div className="p-4 space-y-4 border-t">
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4" />
            Livraison
          </label>
          <Select value={selectedDeliverySlot} onValueChange={setSelectedDeliverySlot}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un créneau" />
            </SelectTrigger>
            <SelectContent>
              {deliverySlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" />
            Notes (optionnel)
          </label>
          <Textarea
            placeholder="Instructions spéciales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4 space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{totals.subtotal.toFixed(2)}€</span>
          </div>
          {clientDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Remise client (-{clientDiscount}%)</span>
              <span>-{totals.discountAmount.toFixed(2)}€</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium">{totals.totalHT.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA (20%)</span>
            <span>{totals.tva.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-1 border-t">
            <span>Total TTC</span>
            <span>{totals.totalTTC.toFixed(2)}€</span>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base"
          size="lg"
          onClick={handleSubmit}
          disabled={totals.itemCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Valider la commande ({totals.itemCount} article
              {totals.itemCount > 1 ? 's' : ''})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Huiles: '🛢️',
    Surgelés: '🍟',
    Fromages: '🧀',
    Sauces: '🥫',
    Pains: '🍞',
    Viandes: '🥩',
    Boissons: '🥤',
  };
  return emojis[category] || '📦';
}

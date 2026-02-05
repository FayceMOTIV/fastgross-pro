'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Calendar,
  MessageSquare,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCart,
  updateCartItem,
  removeFromCart,
  createOrder,
  Cart,
  CartItem,
  getClientProfile,
} from '@/services/client-portal-service';

export default function PanierPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Order options
  const [deliveryDate, setDeliveryDate] = useState<string>('tomorrow');
  const [deliverySlot, setDeliverySlot] = useState<'morning' | 'afternoon'>('morning');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const [cartData, profile] = await Promise.all([
        getCart('client-1'),
        getClientProfile('client-1'),
      ]);
      setCart(cartData);
      if (profile.address.notes) {
        setNotes(profile.address.notes);
      }
    } catch (error) {
      console.error('Erreur chargement panier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    try {
      const updatedCart = await updateCartItem('client-1', productId, newQuantity);
      setCart(updatedCart);
    } catch (error) {
      console.error('Erreur mise à jour quantité:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      const updatedCart = await removeFromCart('client-1', productId);
      setCart(updatedCart);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleSubmitOrder = async () => {
    if (!cart || cart.items.length === 0) return;

    setIsSubmitting(true);
    try {
      const deliveryDateObj = deliveryDate === 'tomorrow'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      await createOrder('client-1', {
        deliveryDate: deliveryDateObj,
        deliverySlot,
        notes: notes.trim() || undefined,
      });

      setOrderSuccess(true);
      setTimeout(() => {
        router.push('/portail/commandes');
      }, 2000);
    } catch (error) {
      console.error('Erreur commande:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Commande validée !</h2>
            <p className="text-muted-foreground mb-4">
              Votre commande a été enregistrée avec succès.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirection vers vos commandes...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <Link href="/portail">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-4">
            Ajoutez des produits depuis le catalogue
          </p>
          <Link href="/portail/catalogue">
            <Button>Voir le catalogue</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-2">
          <Link href="/portail/catalogue">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Mon Panier ({cart.itemCount} articles)
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {cart.items.map((item) => (
            <CartItemCard
              key={item.productId}
              item={item}
              onQuantityChange={(qty) => handleQuantityChange(item.productId, qty)}
              onRemove={() => handleRemoveItem(item.productId)}
              getProductIcon={getProductIcon}
            />
          ))}
        </div>

        {/* Add More */}
        <Link href="/portail/catalogue">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter d'autres produits
          </Button>
        </Link>

        {/* Delivery Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Livraison souhaitée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Select value={deliveryDate} onValueChange={setDeliveryDate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tomorrow">Demain</SelectItem>
                    <SelectItem value="after_tomorrow">Après-demain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Créneau</label>
                <Select value={deliverySlot} onValueChange={(v) => setDeliverySlot(v as 'morning' | 'afternoon')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Matin (8h-12h)</SelectItem>
                    <SelectItem value="afternoon">Après-midi (14h-18h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Instructions de livraison
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Code portail, étage, horaires..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sous-total</span>
              <span>{cart.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Votre remise (-{cart.discountPercent}%)</span>
              <span>-{cart.discount.toFixed(2)}€</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-medium">Total HT</span>
                <span className="font-medium">{cart.totalHT.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>TVA (20%)</span>
                <span>{cart.tva.toFixed(2)}€</span>
              </div>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL TTC</span>
                <span>{cart.totalTTC.toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          size="lg"
          className="w-full h-16 text-lg"
          disabled={isSubmitting}
          onClick={handleSubmitOrder}
        >
          {isSubmitting ? (
            'Validation en cours...'
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              VALIDER MA COMMANDE
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function CartItemCard({
  item,
  onQuantityChange,
  onRemove,
  getProductIcon,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  getProductIcon: (category: string) => string;
}) {
  const hasPromo = item.product.hasPromo;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <span className="text-3xl">{getProductIcon(item.product.category)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{item.product.name}</h3>
                {hasPromo && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    {item.product.promoLabel}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-muted-foreground">
                {item.unitPrice.toFixed(2)}€ × {item.quantity}
              </div>
              <div className="font-bold">
                {item.totalPrice.toFixed(2)}€
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

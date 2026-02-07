'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getClientCatalog,
  addToCart,
  getCart,
  Cart,
  ClientCatalogProduct,
  PRODUCT_CATEGORIES,
} from '@/services/client-portal-service';

export default function CataloguePage() {
  const [products, setProducts] = useState<ClientCatalogProduct[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getClientCatalog(
        'client-1',
        selectedCategory,
        searchQuery || undefined
      );
      setProducts(data);

      // Initialize quantities
      const initialQuantities: Record<string, number> = {};
      data.forEach(p => {
        initialQuantities[p.id] = quantities[p.id] || 0;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Erreur chargement catalogue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const cartData = await getCart('client-1');
      setCart(cartData);
    } catch (error) {
      console.error('Erreur chargement panier:', error);
    }
  };

  const handleSearch = () => {
    loadProducts();
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
    // Remove from added when quantity changes
    setAddedProducts(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleAddToCart = async (product: ClientCatalogProduct) => {
    const qty = quantities[product.id];
    if (qty <= 0) return;

    try {
      const updatedCart = await addToCart('client-1', product.id, qty);
      setCart(updatedCart);
      setQuantities(prev => ({ ...prev, [product.id]: 0 }));
      setAddedProducts(prev => new Set(prev).add(product.id));

      // Remove added indicator after 2 seconds
      setTimeout(() => {
        setAddedProducts(prev => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }, 2000);
    } catch (error) {
      console.error('Erreur ajout panier:', error);
    }
  };

  const getProductIcon = (category: string) => {
    const cat = PRODUCT_CATEGORIES.find(c => c.id === category);
    return cat?.icon || '📦';
  };

  const getStockLabel = (stockLevel: ClientCatalogProduct['stockLevel']) => {
    switch (stockLevel) {
      case 'high': return { label: 'En stock', color: 'text-green-600', icon: '✅' };
      case 'medium': return { label: 'En stock', color: 'text-green-600', icon: '✅' };
      case 'low': return { label: 'Stock faible', color: 'text-amber-600', icon: '⚠️' };
      case 'out': return { label: 'Rupture', color: 'text-red-600', icon: '❌' };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              📦 Catalogue
            </h1>
            <Link href="/portail/panier">
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Panier
                {cart && cart.itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {cart.itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {PRODUCT_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] || 0}
              isAdded={addedProducts.has(product.id)}
              onQuantityChange={(delta) => handleQuantityChange(product.id, delta)}
              onAddToCart={() => handleAddToCart(product)}
              getProductIcon={getProductIcon}
              getStockLabel={getStockLabel}
            />
          ))
        )}
      </div>

      {/* Floating Cart Button */}
      {cart && cart.itemCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <Link href="/portail/panier">
            <Button className="w-full h-14 text-lg shadow-lg">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Voir le panier ({cart.itemCount})
              <span className="ml-auto font-bold">{cart.totalTTC.toFixed(2)}€</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  quantity,
  isAdded,
  onQuantityChange,
  onAddToCart,
  getProductIcon,
  getStockLabel,
}: {
  product: ClientCatalogProduct;
  quantity: number;
  isAdded: boolean;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  getProductIcon: (category: string) => string;
  getStockLabel: (level: ClientCatalogProduct['stockLevel']) => { label: string; color: string; icon: string };
}) {
  const displayPrice = product.hasPromo && product.promoPrice ? product.promoPrice : product.clientPrice;
  const stockInfo = getStockLabel(product.stockLevel);
  const isOutOfStock = product.stockLevel === 'out';

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isAdded && 'ring-2 ring-green-500',
      isOutOfStock && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div className="text-4xl">{getProductIcon(product.category)}</div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{product.name}</h3>
                {product.hasPromo && (
                  <Badge className="bg-green-100 text-green-700 border-0 mt-1">
                    {product.promoLabel}
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {product.description}
            </p>

            {/* Price */}
            <div className="flex items-center gap-2 mt-2">
              {product.hasPromo ? (
                <>
                  <span className="text-sm line-through text-muted-foreground">
                    {product.clientPrice.toFixed(2)}€
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {displayPrice.toFixed(2)}€
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Votre prix:</span>
                  <span className="text-lg font-bold">{displayPrice.toFixed(2)}€</span>
                </>
              )}
              <span className="text-sm text-muted-foreground">/{product.unit}</span>
            </div>

            {/* Stock */}
            <div className={cn('text-sm mt-1', stockInfo.color)}>
              {stockInfo.icon} {stockInfo.label}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isOutOfStock && (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => onQuantityChange(-1)}
              disabled={quantity === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center font-medium text-lg">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => onQuantityChange(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              className={cn(
                'ml-2 min-w-[100px]',
                isAdded && 'bg-green-600 hover:bg-green-700'
              )}
              disabled={quantity === 0}
              onClick={onAddToCart}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Ajouté
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </div>
        )}

        {isOutOfStock && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t text-red-600">
            <AlertCircle className="h-4 w-4" />
            Produit temporairement indisponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Package,
  TrendingUp,
  AlertTriangle,
  Star,
  Percent,
  Eye,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import {
  DISTRAM_CATALOG,
  DISTRAM_CATEGORIES,
  type DistramProduct,
  type DistramCategory,
  getCatalogStats,
} from '@/data/distram-catalog';

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'stock' | 'bestseller';
type ViewMode = 'grid' | 'list';

export default function CataloguesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DistramCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProduct, setSelectedProduct] = useState<DistramProduct | null>(null);
  const [showOnlyPromo, setShowOnlyPromo] = useState(false);
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  // Stats
  const stats = useMemo(() => getCatalogStats(), []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let products = [...DISTRAM_CATALOG];

    // Category filter
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.ref.toLowerCase().includes(query)
      );
    }

    // Promo filter
    if (showOnlyPromo) {
      products = products.filter(p => p.promo);
    }

    // Low stock filter
    if (showOnlyLowStock) {
      products = products.filter(p => p.stock <= p.stockMin);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        products.sort((a, b) => a.prixClient - b.prixClient);
        break;
      case 'price-desc':
        products.sort((a, b) => b.prixClient - a.prixClient);
        break;
      case 'stock':
        products.sort((a, b) => a.stock - b.stock);
        break;
      case 'bestseller':
        products.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
        break;
    }

    return products;
  }, [searchQuery, selectedCategory, sortBy, showOnlyPromo, showOnlyLowStock]);

  const handleAddToCart = (product: DistramProduct, qty: number = 1) => {
    setCart(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + qty,
    }));
    toast.success(`${qty}x ${product.name} ajouté au panier`);
  };

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [productId, qty]) => {
      const product = DISTRAM_CATALOG.find(p => p.id === productId);
      if (product) {
        const price = product.promo ? product.promo.prixPromo : product.prixClient;
        return total + (price * qty);
      }
      return total;
    }, 0);
  }, [cart]);

  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catalogue DISTRAM</h1>
            <p className="text-muted-foreground mt-1">
              {stats.totalProducts} produits halal pour la restauration rapide
            </p>
          </div>

          {cartItemCount > 0 && (
            <Button size="lg" className="shadow-lg bg-orange-600 hover:bg-orange-700">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Panier ({cartItemCount})
              <span className="ml-2 font-bold">{formatCurrency(cartTotal)}</span>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalProducts}</p>
                  <p className="text-sm text-blue-700">Produits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-sm text-green-700">Valeur stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">{stats.lowStockCount}</p>
                  <p className="text-sm text-amber-700">Stock bas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Percent className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900">{stats.promotionCount}</p>
                  <p className="text-sm text-purple-700">Promotions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom, référence, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Trier
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Nom A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price-asc')}>
                  Prix croissant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price-desc')}>
                  Prix décroissant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('stock')}>
                  Stock bas en premier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('bestseller')}>
                  Best-sellers
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showOnlyPromo ? 'default' : 'outline'}
              onClick={() => setShowOnlyPromo(!showOnlyPromo)}
              className={showOnlyPromo ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Percent className="h-4 w-4 mr-1" />
              Promos
            </Button>

            <Button
              variant={showOnlyLowStock ? 'default' : 'outline'}
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
              className={showOnlyLowStock ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Stock bas
            </Button>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn('rounded-none', viewMode === 'grid' && 'bg-muted')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn('rounded-none', viewMode === 'list' && 'bg-muted')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="shrink-0"
          >
            Tous ({DISTRAM_CATALOG.length})
          </Button>
          {DISTRAM_CATEGORIES.map((cat) => {
            const count = DISTRAM_CATALOG.filter(p => p.category === cat.id).length;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="shrink-0"
              >
                {cat.icon} {cat.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Products Grid/List */}
        <div className="text-sm text-muted-foreground mb-2">
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => setSelectedProduct(product)}
                onAddToCart={handleAddToCart}
                cartQty={cart[product.id] || 0}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onView={() => setSelectedProduct(product)}
                onAddToCart={handleAddToCart}
                cartQty={cart[product.id] || 0}
              />
            ))}
          </div>
        )}

        {/* Product Details Modal */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du Produit</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                onAddToCart={handleAddToCart}
                cartQty={cart[selectedProduct.id] || 0}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function ProductCard({
  product,
  onView,
  onAddToCart,
  cartQty,
}: {
  product: DistramProduct;
  onView: () => void;
  onAddToCart: (product: DistramProduct, qty?: number) => void;
  cartQty: number;
}) {
  const stockStatus = getStockStatus(product);
  const category = DISTRAM_CATEGORIES.find(c => c.id === product.category);
  const price = product.promo ? product.promo.prixPromo : product.prixClient;

  function getStockStatus(product: DistramProduct) {
    if (product.stock === 0) return { label: 'Rupture', color: 'bg-red-500', textColor: 'text-red-600' };
    if (product.stock <= product.stockMin) return { label: 'Stock bas', color: 'bg-amber-500', textColor: 'text-amber-600' };
    return { label: 'En stock', color: 'bg-green-500', textColor: 'text-green-600' };
  }

  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-200 overflow-hidden',
      cartQty > 0 && 'ring-2 ring-orange-500'
    )}>
      <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
        <span className="text-5xl">{category?.icon || '📦'}</span>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.bestseller && (
            <Badge className="bg-yellow-500 text-yellow-900 text-xs">
              <Star className="h-3 w-3 mr-1" /> Best-seller
            </Badge>
          )}
          {product.promo && (
            <Badge className="bg-red-500 text-white text-xs">
              -{product.promo.pourcentage}%
            </Badge>
          )}
        </div>

        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium text-white',
          stockStatus.color
        )}>
          {stockStatus.label}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{product.ref}</p>
          <h3 className="font-semibold line-clamp-2 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
          <Badge variant="outline" className={cn('mt-1 text-xs', category?.color)}>
            {category?.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {product.promo ? (
              <>
                <span className="text-sm line-through text-muted-foreground">
                  {formatCurrency(product.prixClient)}
                </span>
                <span className="text-xl font-bold text-red-600 ml-2">
                  {formatCurrency(price)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(price)}
              </span>
            )}
            <span className="text-sm text-muted-foreground ml-1">/{product.unit}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Stock: {product.stock}</span>
          {product.halal && <Badge variant="outline" className="text-green-600">Halal</Badge>}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-1" />
            Détails
          </Button>
          <Button
            size="sm"
            className={cn(
              'flex-1',
              cartQty > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
            )}
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
          >
            {cartQty > 0 ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                {cartQty} ajouté
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductListItem({
  product,
  onView,
  onAddToCart,
  cartQty,
}: {
  product: DistramProduct;
  onView: () => void;
  onAddToCart: (product: DistramProduct, qty?: number) => void;
  cartQty: number;
}) {
  const category = DISTRAM_CATEGORIES.find(c => c.id === product.category);
  const price = product.promo ? product.promo.prixPromo : product.prixClient;

  function getStockStatus(product: DistramProduct) {
    if (product.stock === 0) return { label: 'Rupture', color: 'bg-red-500' };
    if (product.stock <= product.stockMin) return { label: 'Stock bas', color: 'bg-amber-500' };
    return { label: 'En stock', color: 'bg-green-500' };
  }

  const stockStatus = getStockStatus(product);

  return (
    <Card className={cn(
      'hover:shadow-md transition-all',
      cartQty > 0 && 'ring-2 ring-orange-500'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-3xl">{category?.icon || '📦'}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{product.ref}</span>
              {product.bestseller && (
                <Badge className="bg-yellow-500 text-yellow-900 text-xs">Best-seller</Badge>
              )}
              {product.promo && (
                <Badge className="bg-red-500 text-white text-xs">-{product.promo.pourcentage}%</Badge>
              )}
            </div>
            <h3 className="font-semibold truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{product.description}</p>
          </div>

          <div className="text-right shrink-0">
            {product.promo ? (
              <div>
                <span className="text-sm line-through text-muted-foreground block">
                  {formatCurrency(product.prixClient)}
                </span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(price)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold">{formatCurrency(price)}</span>
            )}
            <span className="text-sm text-muted-foreground">/{product.unit}</span>
          </div>

          <div className="text-center shrink-0 w-20">
            <div className={cn('text-xs px-2 py-0.5 rounded-full text-white inline-block', stockStatus.color)}>
              {stockStatus.label}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{product.stock} unités</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className={cn(
                cartQty > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
              )}
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
            >
              {cartQty > 0 ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductDetails({
  product,
  onAddToCart,
  cartQty,
}: {
  product: DistramProduct;
  onAddToCart: (product: DistramProduct, qty?: number) => void;
  cartQty: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const category = DISTRAM_CATEGORIES.find(c => c.id === product.category);
  const price = product.promo ? product.promo.prixPromo : product.prixClient;

  function getStockStatus(product: DistramProduct) {
    if (product.stock === 0) return { label: 'Rupture', color: 'bg-red-500', textColor: 'text-red-600' };
    if (product.stock <= product.stockMin) return { label: 'Stock bas', color: 'bg-amber-500', textColor: 'text-amber-600' };
    return { label: 'En stock', color: 'bg-green-500', textColor: 'text-green-600' };
  }

  const stockStatus = getStockStatus(product);
  const stockPercentage = Math.min((product.stock / product.stockMax) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-7xl">{category?.icon || '📦'}</span>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn(category?.color)}>{category?.label}</Badge>
            {product.bestseller && <Badge className="bg-yellow-500 text-yellow-900">Best-seller</Badge>}
            {product.halal && <Badge variant="outline" className="text-green-600">Halal</Badge>}
            {product.promo && <Badge className="bg-red-500 text-white">-{product.promo.pourcentage}% PROMO</Badge>}
          </div>

          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-muted-foreground font-mono">Réf: {product.ref}</p>
          <p className="text-muted-foreground">{product.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Prix catalogue</p>
          {product.promo ? (
            <div>
              <span className="text-lg line-through text-muted-foreground">{formatCurrency(product.prixVente)}</span>
              <span className="text-3xl font-bold text-red-600 ml-2">{formatCurrency(price)}</span>
            </div>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(price)}</p>
          )}
          <p className="text-sm text-muted-foreground">/{product.unit} • TVA {product.tva}%</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Stock disponible</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold">{product.stock}</p>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', stockStatus.color)}>
              {stockStatus.label}
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={cn('h-2 rounded-full transition-all', stockStatus.color)}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Min: {product.stockMin} • Max: {product.stockMax}
            </p>
          </div>
        </div>
      </div>

      {product.marque && (
        <div className="text-sm">
          <span className="text-muted-foreground">Marque:</span> <span className="font-medium">{product.marque}</span>
        </div>
      )}

      {product.poids && (
        <div className="text-sm">
          <span className="text-muted-foreground">Poids/Contenance:</span> <span className="font-medium">{product.poids}</span>
        </div>
      )}

      {product.dlc && (
        <div className="text-sm">
          <span className="text-muted-foreground">DLC:</span> <span className="font-medium">{product.dlc} jours</span>
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-lg font-medium">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{formatCurrency(price * quantity)}</p>
        </div>

        <Button
          size="lg"
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => {
            onAddToCart(product, quantity);
            setQuantity(1);
          }}
          disabled={product.stock === 0}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Ajouter au panier
        </Button>
      </div>

      {cartQty > 0 && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          {cartQty} {product.unit}(s) déjà dans le panier
        </div>
      )}
    </div>
  );
}

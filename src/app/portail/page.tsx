'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  ShoppingCart,
  Package,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  DollarSign,
  Tag,
  ArrowRight,
  Bell,
  ShoppingBag,
  MapPin,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DISTRAM_CATEGORIES, getPromotions, getBestsellers } from '@/data/distram-catalog';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

// Client DISTRAM Mock data
const mockData = {
  client: {
    businessName: 'Kebab Istanbul',
    contactName: 'Mehmet Yilmaz',
    accountType: 'Gold',
    memberSince: '2023-03-15',
    address: '15 Rue de la République, 69001 Lyon',
    phone: '04 72 12 34 56',
    commercial: 'Hamza K.',
    remise: 10,
  },
  stats: {
    ordersThisMonth: 8,
    totalSpent: 12450,
    pendingOrders: 2,
    unpaidInvoices: 1,
    unpaidAmount: 890,
  },
  // Use real DISTRAM products with promos
  featuredProducts: getPromotions().slice(0, 4).map(p => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    price: p.promo?.prixPromo || p.prixClient,
    originalPrice: p.prixClient,
    discount: p.promo?.pourcentage || 0,
    category: DISTRAM_CATEGORIES.find(c => c.id === p.category)?.label || p.category,
    icon: DISTRAM_CATEGORIES.find(c => c.id === p.category)?.icon || '📦',
    inStock: p.stock > 0,
    isPromo: !!p.promo,
    unit: p.unit,
  })),
  // Use bestsellers for quick order
  quickOrder: getBestsellers().slice(0, 5).map(p => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    lastOrdered: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    price: p.prixClient,
    category: DISTRAM_CATEGORIES.find(c => c.id === p.category)?.label || p.category,
    icon: DISTRAM_CATEGORIES.find(c => c.id === p.category)?.icon || '📦',
    unit: p.unit,
  })),
  recentOrders: [
    {
      id: 'CMD-2024-1089',
      date: new Date().toISOString().split('T')[0],
      status: 'delivering',
      total: 458.30,
      items: 8,
      deliverySlot: 'Après-midi (14h-18h)',
    },
    {
      id: 'CMD-2024-1082',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'delivered',
      total: 672.50,
      items: 12,
    },
    {
      id: 'CMD-2024-1075',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'delivered',
      total: 345.80,
      items: 6,
    },
    {
      id: 'CMD-2024-1068',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'delivered',
      total: 892.40,
      items: 15,
    },
  ],
  notifications: [
    {
      id: '1',
      type: 'promo',
      title: '-15% sur toutes les sauces',
      message: 'Profitez de la promo sauces DISTRAM jusqu\'au 15 février',
      date: new Date().toISOString().split('T')[0],
      isNew: true,
    },
    {
      id: '2',
      type: 'order',
      title: 'Commande CMD-2024-1089 en livraison',
      message: 'Ahmed B. arrive cet après-midi entre 14h et 18h',
      date: new Date().toISOString().split('T')[0],
      isNew: true,
    },
    {
      id: '3',
      type: 'invoice',
      title: 'Facture F-2024-0892 en attente',
      message: 'Montant: 890€ - Échéance dépassée de 5 jours',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isNew: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'Nouveau catalogue DISTRAM',
      message: '98 produits halal pour la restauration rapide',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isNew: false,
    },
  ],
};

export default function PortailHomePage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  };

  const handleAddToCart = (productId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _qty = quantities[productId] || 1;
    // In production, add to cart with quantity
    // Reset quantity after adding
    setQuantities(prev => ({ ...prev, [productId]: 0 }));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'delivered':
        return { icon: CheckCircle, label: 'Livrée', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950' };
      case 'delivering':
        return { icon: Truck, label: 'En livraison', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' };
      case 'preparing':
        return { icon: Clock, label: 'En préparation', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' };
      case 'pending':
        return { icon: Clock, label: 'En attente', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950' };
      default:
        return { icon: Package, label: 'En cours', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950' };
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Client {mockData.client.accountType}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Tag className="h-3 w-3 mr-1" />
                  -{mockData.client.remise}% remise
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Bienvenue, {mockData.client.businessName}
              </h1>
              <div className="text-orange-50 space-y-1">
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Contact: {mockData.client.contactName}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{mockData.client.address}</span>
                </p>
                <p className="text-sm opacity-80">
                  Commercial DISTRAM: {mockData.client.commercial} • Client depuis {new Date(mockData.client.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg">
                <Phone className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">{mockData.client.phone}</span>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Mail className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Message</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-orange-200 dark:border-orange-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                  Ce mois
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.stats.ordersThisMonth}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Commandes</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                  Total
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(mockData.stats.totalSpent)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dépensé ce mois</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  En cours
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.stats.pendingOrders}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Commandes en cours</p>
            </CardContent>
          </Card>

          <Card className={mockData.stats.unpaidInvoices > 0 ? "border-red-200 dark:border-red-900 hover:shadow-lg transition-shadow" : "border-amber-200 dark:border-amber-900 hover:shadow-lg transition-shadow"}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className={mockData.stats.unpaidInvoices > 0 ? "h-8 w-8 text-red-600 dark:text-red-400" : "h-8 w-8 text-amber-600 dark:text-amber-400"} />
                <Badge variant="secondary" className={mockData.stats.unpaidInvoices > 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}>
                  {mockData.stats.unpaidInvoices > 0 ? 'À payer' : 'Factures'}
                </Badge>
              </div>
              <div className={`text-3xl font-bold mb-1 ${mockData.stats.unpaidInvoices > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {mockData.stats.unpaidInvoices > 0 ? formatCurrency(mockData.stats.unpaidAmount) : '0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mockData.stats.unpaidInvoices > 0 ? `${mockData.stats.unpaidInvoices} facture(s) impayée(s)` : 'Tout est réglé'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/portail/catalogue">
            <Card className="border-2 border-orange-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nouvelle Commande</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Parcourir le catalogue</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portail/factures">
            <Card className="border-2 hover:border-orange-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Mes Factures</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Consulter et télécharger</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/chat">
            <Card className="border-2 hover:border-orange-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Support Client</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Besoin d'aide?</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Featured Products/Promotions */}
        <Card className="border-2 border-amber-300 dark:border-amber-700">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-xl">Promotions en cours</CardTitle>
              </div>
              <Link href="/portail/catalogue?filter=promo">
                <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950">
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {mockData.featuredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="relative">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        {product.icon}
                      </div>
                    </div>
                    {product.isPromo && (
                      <Badge className="absolute top-2 right-2 bg-red-600 text-white">
                        -{product.discount}%
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-mono mb-1">{product.ref}</p>
                    <h4 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[40px]">{product.name}</h4>
                    <div className="mb-3">
                      {product.isPromo && product.originalPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-sm line-through text-gray-400">
                            {formatCurrency(product.originalPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">/{product.unit}</span>
                    </div>
                    <Button
                      size="lg"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Reorder */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <CardTitle className="text-xl">Commande rapide</CardTitle>
                  </div>
                  <Badge variant="secondary">Produits habituels</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockData.quickOrder.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      {product.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">{product.ref}</p>
                      <h4 className="font-semibold text-sm mb-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Dernière commande: {new Date(product.lastOrdered).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-xs text-muted-foreground">/{product.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={quantities[product.id] || ''}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        placeholder="Qté"
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-center bg-white dark:bg-gray-800"
                      />
                      <Button
                        size="lg"
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                        onClick={() => handleAddToCart(product.id)}
                        disabled={!quantities[product.id] || quantities[product.id] <= 0}
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Link href="/portail/catalogue">
                  <Button variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950">
                    Voir tout le catalogue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <CardTitle className="text-xl">Notifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockData.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      {notification.type === 'promo' && <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />}
                      {notification.type === 'order' && <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />}
                      {notification.type === 'info' && <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          {notification.isNew && (
                            <Badge className="bg-red-600 text-white h-2 w-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(notification.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-xl">Commandes récentes</CardTitle>
              </div>
              <Link href="/portail/commandes">
                <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950">
                  Voir toutes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.recentOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Link key={order.id} href={`/portail/commandes/${order.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${statusConfig.bg}`}>
                          <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{order.id}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>{new Date(order.date).toLocaleDateString('fr-FR')}</span>
                            <span>•</span>
                            <span>{order.items} articles</span>
                            {order.status === 'delivering' && order.deliverySlot && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {order.deliverySlot}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg mb-1">{formatCurrency(order.total)}</div>
                        <Badge className={statusConfig.bg + ' ' + statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Support Banner */}
        <Card className="bg-gradient-to-r from-orange-600 to-amber-600 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Besoin d'aide?</h3>
                  <p className="text-orange-50">Notre équipe est à votre disposition du lundi au vendredi, 8h-18h</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                  <Phone className="h-5 w-5 mr-2" />
                  01 23 45 67 89
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Mail className="h-5 w-5 mr-2" />
                  Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

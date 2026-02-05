'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  ShoppingCart,
  Package,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Star,
  RefreshCw,
  Phone,
  Mail,
  Award,
  DollarSign,
  Tag,
  ArrowRight,
  Bell,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

// Mock data
const mockData = {
  client: {
    businessName: 'Restaurant Le Gourmet',
    contactName: 'Jean Dupont',
    accountType: 'Premium',
    memberSince: '2023-01-15',
  },
  stats: {
    ordersThisMonth: 12,
    totalSpent: 24500,
    pendingOrders: 2,
    loyaltyPoints: 2450,
  },
  featuredProducts: [
    {
      id: '1',
      name: 'Huile d\'Olive Extra Vierge Premium',
      image: '/api/placeholder/300/300',
      price: 45.90,
      originalPrice: 52.90,
      discount: 13,
      category: 'Huiles',
      inStock: true,
      isPromo: true,
    },
    {
      id: '2',
      name: 'Fromage Comté AOP 18 mois',
      image: '/api/placeholder/300/300',
      price: 28.50,
      category: 'Fromages',
      inStock: true,
      isPromo: false,
    },
    {
      id: '3',
      name: 'Frites Surgelées Premium 2.5kg',
      image: '/api/placeholder/300/300',
      price: 8.90,
      originalPrice: 10.90,
      discount: 18,
      category: 'Surgelés',
      inStock: true,
      isPromo: true,
    },
    {
      id: '4',
      name: 'Sauce Tomate Italienne Bio 5L',
      image: '/api/placeholder/300/300',
      price: 15.50,
      category: 'Sauces',
      inStock: true,
      isPromo: false,
    },
  ],
  quickOrder: [
    {
      id: '1',
      name: 'Huile de Tournesol 5L',
      lastOrdered: '2026-01-28',
      price: 12.50,
      image: '/api/placeholder/100/100',
      category: 'Huiles',
    },
    {
      id: '2',
      name: 'Frites Belges 2.5kg',
      lastOrdered: '2026-01-25',
      price: 9.20,
      image: '/api/placeholder/100/100',
      category: 'Surgelés',
    },
    {
      id: '3',
      name: 'Fromage Mozzarella 1kg',
      lastOrdered: '2026-01-25',
      price: 7.80,
      image: '/api/placeholder/100/100',
      category: 'Fromages',
    },
    {
      id: '4',
      name: 'Pain Hamburger x24',
      lastOrdered: '2026-01-20',
      price: 4.50,
      image: '/api/placeholder/100/100',
      category: 'Pains',
    },
  ],
  recentOrders: [
    {
      id: 'CMD-2026-145',
      date: '2026-02-01',
      status: 'delivered',
      total: 1250.50,
      items: 15,
    },
    {
      id: 'CMD-2026-144',
      date: '2026-01-28',
      status: 'in_transit',
      total: 890.30,
      items: 12,
      deliveryDate: '2026-02-03',
    },
    {
      id: 'CMD-2026-143',
      date: '2026-01-25',
      status: 'processing',
      total: 2100.80,
      items: 24,
    },
    {
      id: 'CMD-2026-142',
      date: '2026-01-22',
      status: 'delivered',
      total: 1580.20,
      items: 18,
    },
  ],
  notifications: [
    {
      id: '1',
      type: 'promo',
      title: 'Nouvelle promotion disponible',
      message: 'Profitez de -20% sur tous les produits surgelés jusqu\'au 15 février',
      date: '2026-02-02',
      isNew: true,
    },
    {
      id: '2',
      type: 'order',
      title: 'Votre commande CMD-2026-144 est en route',
      message: 'Livraison prévue le 3 février avant 14h',
      date: '2026-02-01',
      isNew: true,
    },
    {
      id: '3',
      type: 'info',
      title: 'Nouveaux produits au catalogue',
      message: '15 nouveaux produits bio ont été ajoutés à notre catalogue',
      date: '2026-01-30',
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
    const qty = quantities[productId] || 1;
    console.log(`Adding ${qty} of product ${productId} to cart`);
    // Reset quantity after adding
    setQuantities(prev => ({ ...prev, [productId]: 0 }));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'delivered':
        return { icon: CheckCircle, label: 'Livrée', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950' };
      case 'in_transit':
        return { icon: Truck, label: 'En livraison', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' };
      case 'processing':
        return { icon: Clock, label: 'En préparation', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' };
      default:
        return { icon: Package, label: 'En attente', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950' };
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
                  {mockData.client.accountType}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Award className="h-3 w-3 mr-1" />
                  {mockData.stats.loyaltyPoints} points
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Bienvenue, {mockData.client.businessName}
              </h1>
              <p className="text-orange-50 flex items-center gap-2">
                <span>Contact: {mockData.client.contactName}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">Client depuis {new Date(mockData.client.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg">
                <Phone className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Contacter</span>
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
                {mockData.stats.totalSpent.toLocaleString('fr-FR')}€
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dépensé</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  En cours
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.stats.pendingOrders}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  Fidélité
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.stats.loyaltyPoints}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Points</p>
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

          <Link href="/portail/support">
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
                        {product.category === 'Huiles' ? '🛢️' :
                         product.category === 'Fromages' ? '🧀' :
                         product.category === 'Surgelés' ? '🍟' : '🥫'}
                      </div>
                    </div>
                    {product.isPromo && (
                      <Badge className="absolute top-2 right-2 bg-red-600 text-white">
                        -{product.discount}%
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[40px]">{product.name}</h4>
                    <div className="mb-3">
                      {product.isPromo && product.originalPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {product.price.toFixed(2)}€
                          </span>
                          <span className="text-sm line-through text-gray-400">
                            {product.originalPrice.toFixed(2)}€
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {product.price.toFixed(2)}€
                        </span>
                      )}
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
                      {product.category === 'Huiles' ? '🛢️' :
                       product.category === 'Fromages' ? '🧀' :
                       product.category === 'Surgelés' ? '🍟' : '🍞'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Dernière commande: {new Date(product.lastOrdered).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {product.price.toFixed(2)}€
                        </span>
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
                            {order.status === 'in_transit' && order.deliveryDate && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Livraison: {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg mb-1">{order.total.toFixed(2)}€</div>
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

'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Truck,
  Phone,
  Navigation,
  MapPin,
  Package,
  Euro,
  Star,
  Clock,
  TrendingUp,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

type DriverStatus = 'available' | 'busy' | 'break';
type DeliveryStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';

interface Delivery {
  id: string;
  client: string;
  address: string;
  postalCode: string;
  city: string;
  items: number;
  amount: number;
  status: DeliveryStatus;
  eta: string;
  phone: string;
}

const mockDeliveries: Delivery[] = [
  {
    id: '1',
    client: 'Restaurant Le Gourmet',
    address: '15 Rue de la Paix',
    postalCode: '75002',
    city: 'Paris',
    items: 12,
    amount: 245.50,
    status: 'in_progress',
    eta: '10:30',
    phone: '+33 1 42 96 12 34',
  },
  {
    id: '2',
    client: 'Boulangerie St-Michel',
    address: '8 Boulevard Saint-Michel',
    postalCode: '75005',
    city: 'Paris',
    items: 8,
    amount: 156.00,
    status: 'pending',
    eta: '11:15',
    phone: '+33 1 43 25 67 89',
  },
  {
    id: '3',
    client: 'Café de la Place',
    address: '23 Place de la République',
    postalCode: '75011',
    city: 'Paris',
    items: 15,
    amount: 320.75,
    status: 'pending',
    eta: '12:00',
    phone: '+33 1 48 05 43 21',
  },
  {
    id: '4',
    client: 'Pizzeria Bella Napoli',
    address: '42 Rue des Martyrs',
    postalCode: '75009',
    city: 'Paris',
    items: 10,
    amount: 198.25,
    status: 'pending',
    eta: '12:45',
    phone: '+33 1 42 81 29 30',
  },
  {
    id: '5',
    client: 'Bistrot du Marché',
    address: '5 Rue Mouffetard',
    postalCode: '75005',
    city: 'Paris',
    items: 20,
    amount: 425.00,
    status: 'pending',
    eta: '14:00',
    phone: '+33 1 43 31 50 12',
  },
  {
    id: '6',
    client: 'Sushi Sakura',
    address: '18 Rue Sainte-Anne',
    postalCode: '75001',
    city: 'Paris',
    items: 6,
    amount: 132.50,
    status: 'pending',
    eta: '15:15',
    phone: '+33 1 42 60 22 33',
  },
  {
    id: '7',
    client: 'Épicerie Fine Marcel',
    address: '31 Rue du Cherche-Midi',
    postalCode: '75006',
    city: 'Paris',
    items: 25,
    amount: 567.80,
    status: 'pending',
    eta: '16:30',
    phone: '+33 1 45 48 92 44',
  },
  {
    id: '8',
    client: 'Brasserie Les Halles',
    address: '9 Rue Rambuteau',
    postalCode: '75004',
    city: 'Paris',
    items: 18,
    amount: 389.90,
    status: 'pending',
    eta: '17:45',
    phone: '+33 1 42 36 18 55',
  },
];

const earningsData = [
  { day: 'Lun', amount: 145 },
  { day: 'Mar', amount: 168 },
  { day: 'Mer', amount: 152 },
  { day: 'Jeu', amount: 189 },
  { day: 'Ven', amount: 175 },
  { day: 'Sam', amount: 210 },
  { day: 'Auj', amount: 185 },
];

export default function LivreurPage() {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('available');
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries);

  const driverName = 'Mohamed';
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const stats = {
    deliveriesToday: deliveries.filter(d => d.status === 'delivered').length + 1,
    distanceCovered: 42.5,
    earnings: 185.50,
    rating: 4.8,
  };

  const getStatusBadge = (status: DriverStatus) => {
    const badges = {
      available: {
        label: 'Disponible',
        className: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
        icon: CheckCircle2,
      },
      busy: {
        label: 'En livraison',
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        icon: Truck,
      },
      break: {
        label: 'En pause',
        className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
        icon: Clock,
      },
    };
    return badges[status];
  };

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    const badges = {
      pending: {
        label: 'En attente',
        className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
      in_progress: {
        label: 'En cours',
        className: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
      },
      delivered: {
        label: 'Livrée',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      },
      cancelled: {
        label: 'Annulée',
        className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      },
    };
    return badges[status];
  };

  const handleStartDelivery = (deliveryId: string) => {
    setDeliveries(deliveries.map(d =>
      d.id === deliveryId ? { ...d, status: 'in_progress' as DeliveryStatus } : d
    ));
    setDriverStatus('busy');
  };

  const handleMarkDelivered = (deliveryId: string) => {
    setDeliveries(deliveries.map(d =>
      d.id === deliveryId ? { ...d, status: 'delivered' as DeliveryStatus } : d
    ));
    setDriverStatus('available');
  };

  const currentBadge = getStatusBadge(driverStatus);
  const CurrentIcon = currentBadge.icon;

  const maxEarnings = Math.max(...earningsData.map(d => d.amount));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-emerald-500/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Bonjour {driverName} !
              </h1>
              <p className="text-emerald-50 capitalize text-sm md:text-base">
                {today}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {(['available', 'busy', 'break'] as DriverStatus[]).map((status) => {
                const badge = getStatusBadge(status);
                const Icon = badge.icon;
                return (
                  <Button
                    key={status}
                    onClick={() => setDriverStatus(status)}
                    className={cn(
                      'h-12 px-6 text-base font-semibold transition-all duration-200 shadow-lg',
                      driverStatus === status
                        ? badge.className
                        : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {badge.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Status Display */}
        <div className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <Activity className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Statut actuel:
          </span>
          <Badge className={cn('px-4 py-1.5 text-sm font-semibold', currentBadge.className)}>
            <CurrentIcon className="h-4 w-4 mr-1.5" />
            {currentBadge.label}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {stats.deliveriesToday}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Livraisons aujourd'hui
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {stats.distanceCovered} km
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Distance parcourue
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Euro className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {stats.earnings.toFixed(2)} €
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Gains du jour
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                  <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                {stats.rating}
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Note moyenne
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Livraisons du jour
            </h2>
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1">
              {deliveries.filter(d => d.status === 'pending').length} en attente
            </Badge>
          </div>

          <div className="grid gap-4">
            {deliveries.map((delivery) => {
              const statusBadge = getDeliveryStatusBadge(delivery.status);
              const isActive = delivery.status === 'in_progress';

              return (
                <Card
                  key={delivery.id}
                  className={cn(
                    'border-none shadow-lg transition-all duration-200 hover:shadow-xl',
                    isActive
                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 ring-2 ring-emerald-500'
                      : 'bg-white dark:bg-slate-900'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            {delivery.client}
                          </CardTitle>
                          {isActive && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white animate-pulse">
                              EN COURS
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-500" />
                            <span>{delivery.address}</span>
                          </div>
                          <div className="ml-6">
                            {delivery.postalCode} {delivery.city}
                          </div>
                        </div>
                      </div>
                      <Badge className={cn('px-3 py-1.5 font-semibold', statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Delivery Info */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-900 dark:text-white font-bold text-lg mb-1">
                          <Package className="h-4 w-4" />
                          {delivery.items}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Articles
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-lg mb-1">
                          <Euro className="h-4 w-4" />
                          {delivery.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Montant
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-lg mb-1">
                          <Clock className="h-4 w-4" />
                          {delivery.eta}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ETA
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {delivery.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleStartDelivery(delivery.id)}
                          className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
                        >
                          <PlayCircle className="h-5 w-5 mr-2" />
                          Démarrer
                        </Button>
                      </div>
                    )}

                    {delivery.status === 'in_progress' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleMarkDelivered(delivery.id)}
                          className="h-14 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Livré
                        </Button>
                        <Button
                          onClick={() => window.open(`tel:${delivery.phone}`)}
                          className="h-14 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-lg"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Appeler
                        </Button>
                        <Button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(`${delivery.address}, ${delivery.city}`)}`)}
                          className="h-14 col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30"
                        >
                          <Navigation className="h-5 w-5 mr-2" />
                          Navigation
                        </Button>
                      </div>
                    )}

                    {delivery.status === 'delivered' && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-700 dark:text-green-300 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        Livraison terminée
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Earnings Summary Chart */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
                Gains de la semaine
              </CardTitle>
              <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1">
                +12.5%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earningsData.map((day, index) => {
                const percentage = (day.amount / maxEarnings) * 100;
                const isToday = day.day === 'Auj';

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(
                        'font-semibold',
                        isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                      )}>
                        {day.day}
                      </span>
                      <span className={cn(
                        'font-bold',
                        isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      )}>
                        {day.amount} €
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isToday
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                            : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total de la semaine
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {earningsData.reduce((sum, day) => sum + day.amount, 0).toFixed(2)} €
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                  <Euro className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

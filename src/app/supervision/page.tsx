'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Users,
  TrendingUp,
  ShoppingCart,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  XCircle,
  Truck,
  Package,
  MapPin,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

// DISTRAM Mock Data
const mockData = {
  manager: {
    name: 'Ahmed Benali',
    role: 'Directeur Commercial',
    team: 'DISTRAM Lyon',
  },
  overview: {
    teamMembers: 8,
    activeToday: 6,
    ordersProcessed: 47,
    revenue: 28450,
    revenueChange: 8.5,
    ordersChange: 12.3,
    avgOrderValue: 605,
    clientsActifs: 145,
  },
  depots: [
    { id: 'lyon', name: 'Lyon (Siège)', orders: 28, revenue: 16800, status: 'active' },
    { id: 'montpellier', name: 'Montpellier', orders: 12, revenue: 7200, status: 'active' },
    { id: 'bordeaux', name: 'Bordeaux', orders: 7, revenue: 4450, status: 'active' },
  ],
  teamPerformance: [
    {
      id: 1,
      name: 'Mohamed Khelifi',
      role: 'Commercial Senior',
      avatar: 'MK',
      depot: 'Lyon',
      status: 'active',
      orders: 12,
      revenue: 7250,
      target: 10000,
      performance: 72.5,
      trend: 'up',
      lastActivity: '5 min',
      clients: 45,
    },
    {
      id: 2,
      name: 'Fatima Zahra',
      role: 'Commercial',
      avatar: 'FZ',
      depot: 'Lyon',
      status: 'active',
      orders: 9,
      revenue: 5400,
      target: 8000,
      performance: 67.5,
      trend: 'up',
      lastActivity: '12 min',
      clients: 32,
    },
    {
      id: 3,
      name: 'Karim Belhadj',
      role: 'Commercial Senior',
      avatar: 'KB',
      depot: 'Montpellier',
      status: 'active',
      orders: 8,
      revenue: 4800,
      target: 7000,
      performance: 68.6,
      trend: 'up',
      lastActivity: '8 min',
      clients: 28,
    },
    {
      id: 4,
      name: 'Nadia Amrani',
      role: 'Commercial',
      avatar: 'NA',
      depot: 'Montpellier',
      status: 'away',
      orders: 4,
      revenue: 2400,
      target: 5000,
      performance: 48.0,
      trend: 'down',
      lastActivity: '2h',
      clients: 18,
    },
    {
      id: 5,
      name: 'Youssef El Idrissi',
      role: 'Commercial',
      avatar: 'YE',
      depot: 'Bordeaux',
      status: 'active',
      orders: 7,
      revenue: 4450,
      target: 6000,
      performance: 74.2,
      trend: 'up',
      lastActivity: '3 min',
      clients: 22,
    },
    {
      id: 6,
      name: 'Rachid Mansouri',
      role: 'Commercial Junior',
      avatar: 'RM',
      depot: 'Lyon',
      status: 'active',
      orders: 7,
      revenue: 4150,
      target: 5000,
      performance: 83.0,
      trend: 'up',
      lastActivity: '18 min',
      clients: 15,
    },
  ],
  alerts: [
    {
      id: 1,
      type: 'critical',
      title: 'Rupture de stock imminente',
      description: 'Kebab Volaille Halal - Stock < 50 kg (dépôt Lyon)',
      time: '10 min',
      assignee: 'Équipe Logistique',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Livraison en retard',
      description: 'Commande #DIS-2024-1856 - Kebab Istanbul (+45min)',
      time: '25 min',
      assignee: 'Livreur Hassan',
    },
    {
      id: 3,
      type: 'info',
      title: 'Nouveau client à valider',
      description: "Le Sultan d'Orient - Lyon 7ème - Demande crédit",
      time: '1h',
      assignee: 'Mohamed K.',
    },
  ],
  pendingApprovals: [
    {
      id: 1,
      type: 'discount',
      title: 'Remise fidélité 12%',
      client: 'Chez Momo Kebab',
      amount: 380,
      requestedBy: 'Mohamed K.',
      time: '15 min',
    },
    {
      id: 2,
      type: 'credit',
      title: 'Augmentation encours crédit',
      client: 'Pizza Anatolie',
      amount: 3000,
      requestedBy: 'Fatima Z.',
      time: '30 min',
    },
    {
      id: 3,
      type: 'return',
      title: 'Retour marchandise (pain périmé)',
      client: 'Snack Le Médina',
      amount: 145,
      requestedBy: 'Karim B.',
      time: '2h',
    },
  ],
  recentActivity: [
    {
      id: 1,
      type: 'order',
      user: 'Mohamed K.',
      action: 'a créé une commande',
      target: '#DIS-2024-1867',
      amount: 890,
      time: '2 min',
    },
    {
      id: 2,
      type: 'delivery',
      user: 'Livreur Hassan',
      action: 'a livré la commande',
      target: '#DIS-2024-1855',
      time: '8 min',
    },
    {
      id: 3,
      type: 'approval',
      user: 'Vous',
      action: 'avez approuvé une remise pour',
      target: 'Kebab Istanbul',
      time: '15 min',
    },
    {
      id: 4,
      type: 'order',
      user: 'Youssef E.',
      action: 'a créé une commande',
      target: '#DIS-2024-1866',
      amount: 1240,
      time: '22 min',
    },
    {
      id: 5,
      type: 'client',
      user: 'Fatima Z.',
      action: 'a ajouté un nouveau client',
      target: "Le Sultan d'Orient",
      time: '45 min',
    },
  ],
  topProducts: [
    { name: 'Kebab Volaille Halal', sales: 450, unit: 'kg' },
    { name: 'Pain Pita Turc', sales: 320, unit: 'pcs' },
    { name: 'Sauce Blanche Maison', sales: 180, unit: 'L' },
    { name: 'Frites Fraîches 10mm', sales: 280, unit: 'kg' },
  ],
};

export default function SupervisionPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'away'>('all');
  const [selectedDepot, setSelectedDepot] = useState<'all' | 'lyon' | 'montpellier' | 'bordeaux'>('all');

  const filteredTeam = mockData.teamPerformance.filter((member) => {
    const statusMatch = selectedFilter === 'all' || member.status === selectedFilter;
    const depotMatch = selectedDepot === 'all' || member.depot.toLowerCase() === selectedDepot;
    return statusMatch && depotMatch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Tableau de Bord DISTRAM
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Bonjour {mockData.manager.name} • {mockData.manager.team}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Rapports
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Target className="h-4 w-4" />
              Objectifs
            </Button>
          </div>
        </div>

        {/* Depots Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          {mockData.depots.map((depot) => (
            <Card
              key={depot.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedDepot === depot.id && "ring-2 ring-violet-500"
              )}
              onClick={() => setSelectedDepot(selectedDepot === depot.id ? 'all' : depot.id as 'lyon' | 'montpellier' | 'bordeaux')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{depot.name}</h4>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{depot.orders} cmd</span>
                      <span className="font-semibold text-violet-600">{formatCurrency(depot.revenue)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-400">
                    Clients Actifs
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-violet-900 dark:text-violet-100">
                      {mockData.overview.clientsActifs}
                    </h3>
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      +8 ce mois
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Commandes Aujourd'hui
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {mockData.overview.ordersProcessed}
                    </h3>
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {mockData.overview.ordersChange}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    CA Aujourd'hui
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mockData.overview.revenue)}
                    </h3>
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {mockData.overview.revenueChange}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Euro className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Panier Moyen
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mockData.overview.avgOrderValue)}
                    </h3>
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">+3.2%</span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Team Performance */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-lg font-semibold">
                    Performance Équipe Commerciale
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('all')}
                      className={cn(
                        selectedFilter === 'all' &&
                          'bg-violet-600 hover:bg-violet-700'
                      )}
                    >
                      Tous ({mockData.teamPerformance.length})
                    </Button>
                    <Button
                      variant={selectedFilter === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('active')}
                      className={cn(
                        selectedFilter === 'active' &&
                          'bg-violet-600 hover:bg-violet-700'
                      )}
                    >
                      Actifs
                    </Button>
                    <Button
                      variant={selectedFilter === 'away' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter('away')}
                      className={cn(
                        selectedFilter === 'away' &&
                          'bg-violet-600 hover:bg-violet-700'
                      )}
                    >
                      Absents
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredTeam.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-violet-500/30">
                          {member.avatar}
                        </div>
                        <div
                          className={cn(
                            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900',
                            member.status === 'active' && 'bg-green-500',
                            member.status === 'away' && 'bg-amber-500',
                            member.status === 'inactive' && 'bg-slate-400'
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {member.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {member.role}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {member.depot}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(member.revenue)}
                              </p>
                              {member.trend === 'up' ? (
                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {member.orders} cmd • {member.clients} clients
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">
                              Objectif: {formatCurrency(member.target)}
                            </span>
                            <Badge
                              className={cn(
                                member.performance >= 80
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                  : member.performance >= 60
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                              )}
                            >
                              {member.performance}%
                            </Badge>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                member.performance >= 80
                                  ? 'bg-green-500'
                                  : member.performance >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${Math.min(member.performance, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Dernière activité: {member.lastActivity}</span>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              Voir détails
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Alerts */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Alertes
                  <Badge className="bg-red-500 text-white ml-auto">
                    {mockData.alerts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      alert.type === 'critical' &&
                        'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
                      alert.type === 'warning' &&
                        'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
                      alert.type === 'info' &&
                        'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-1.5',
                          alert.type === 'critical' && 'bg-red-500',
                          alert.type === 'warning' && 'bg-amber-500',
                          alert.type === 'info' && 'bg-blue-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {alert.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            {alert.assignee}
                          </span>
                          <span className="text-xs text-slate-500">
                            {alert.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" size="sm">
                  Voir toutes les alertes
                </Button>
              </CardContent>
            </Card>

            {/* Quick Approval Queue */}
            <Card className="border-violet-200 dark:border-violet-900">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-600" />
                  Validations en attente
                  <Badge className="bg-violet-600 text-white ml-auto">
                    {mockData.pendingApprovals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockData.pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900 dark:text-white">
                            {approval.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {approval.client}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            approval.type === 'discount' &&
                              'border-blue-300 text-blue-700 dark:text-blue-400',
                            approval.type === 'credit' &&
                              'border-purple-300 text-purple-700 dark:text-purple-400',
                            approval.type === 'return' &&
                              'border-amber-300 text-amber-700 dark:text-amber-400'
                          )}
                        >
                          {formatCurrency(approval.amount)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Par {approval.requestedBy}</span>
                        <span>{approval.time}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 h-8 bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                  size="sm"
                >
                  Voir toutes les validations
                </Button>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Ventes Aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockData.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{product.name}</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {product.sales} {product.unit}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-600" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.recentActivity.map((activity, index) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        activity.type === 'order' &&
                          'bg-blue-100 dark:bg-blue-900/30',
                        activity.type === 'approval' &&
                          'bg-green-100 dark:bg-green-900/30',
                        activity.type === 'delivery' &&
                          'bg-purple-100 dark:bg-purple-900/30',
                        activity.type === 'client' &&
                          'bg-amber-100 dark:bg-amber-900/30'
                      )}
                    >
                      {activity.type === 'order' && (
                        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                      {activity.type === 'approval' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      {activity.type === 'delivery' && (
                        <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      )}
                      {activity.type === 'client' && (
                        <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    {index < mockData.recentActivity.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white">
                          <span className="font-semibold">{activity.user}</span>{' '}
                          {activity.action}{' '}
                          <span className="font-medium text-violet-600 dark:text-violet-400">
                            {activity.target}
                          </span>
                        </p>
                        {activity.amount && (
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                            {formatCurrency(activity.amount)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" size="sm">
              Voir toute l'activité
            </Button>
          </CardContent>
        </Card>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

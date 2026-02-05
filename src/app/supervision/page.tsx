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
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  FileCheck,
  XCircle,
  Truck,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

// Mock data
const mockData = {
  manager: {
    name: 'Mohamed Derradji',
    role: 'Directeur Commercial',
    team: 'Équipe Paris',
  },
  overview: {
    teamMembers: 12,
    activeToday: 9,
    ordersProcessed: 147,
    revenue: 45680,
    revenueChange: 12.5,
    ordersChange: 8.3,
  },
  teamPerformance: [
    {
      id: 1,
      name: 'Sarah Martin',
      role: 'Commercial Senior',
      avatar: 'SM',
      status: 'active',
      orders: 23,
      revenue: 8450,
      target: 10000,
      performance: 84.5,
      trend: 'up',
      lastActivity: '5 min',
    },
    {
      id: 2,
      name: 'Thomas Dubois',
      role: 'Commercial',
      avatar: 'TD',
      status: 'active',
      orders: 18,
      revenue: 6200,
      target: 8000,
      performance: 77.5,
      trend: 'up',
      lastActivity: '12 min',
    },
    {
      id: 3,
      name: 'Marie Laurent',
      role: 'Commercial Senior',
      avatar: 'ML',
      status: 'active',
      orders: 21,
      revenue: 7890,
      target: 10000,
      performance: 78.9,
      trend: 'down',
      lastActivity: '8 min',
    },
    {
      id: 4,
      name: 'Pierre Moreau',
      role: 'Commercial',
      avatar: 'PM',
      status: 'away',
      orders: 15,
      revenue: 5340,
      target: 8000,
      performance: 66.8,
      trend: 'up',
      lastActivity: '45 min',
    },
    {
      id: 5,
      name: 'Julie Bernard',
      role: 'Commercial',
      avatar: 'JB',
      status: 'active',
      orders: 19,
      revenue: 6800,
      target: 8000,
      performance: 85.0,
      trend: 'up',
      lastActivity: '3 min',
    },
    {
      id: 6,
      name: 'Lucas Petit',
      role: 'Commercial Junior',
      avatar: 'LP',
      status: 'inactive',
      orders: 8,
      revenue: 2900,
      target: 5000,
      performance: 58.0,
      trend: 'down',
      lastActivity: '2h',
    },
  ],
  alerts: [
    {
      id: 1,
      type: 'critical',
      title: 'Retard de livraison',
      description: 'Commande #1234 en retard de 2h - Client VIP',
      time: '5 min',
      assignee: 'Thomas Dubois',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Stock faible',
      description: 'Produit REF-789 - Moins de 10 unités',
      time: '15 min',
      assignee: 'Équipe Logistique',
    },
    {
      id: 3,
      type: 'info',
      title: 'Nouveau client',
      description: 'Restaurant "Le Gourmet" - Validation requise',
      time: '30 min',
      assignee: 'Sarah Martin',
    },
  ],
  pendingApprovals: [
    {
      id: 1,
      type: 'discount',
      title: 'Remise exceptionnelle 15%',
      client: 'Bistrot des Halles',
      amount: 450,
      requestedBy: 'Sarah Martin',
      time: '10 min',
    },
    {
      id: 2,
      type: 'credit',
      title: 'Augmentation plafond crédit',
      client: 'Restaurant Le Paris',
      amount: 5000,
      requestedBy: 'Thomas Dubois',
      time: '25 min',
    },
    {
      id: 3,
      type: 'return',
      title: 'Retour marchandise',
      client: 'Café Central',
      amount: 320,
      requestedBy: 'Marie Laurent',
      time: '1h',
    },
  ],
  recentActivity: [
    {
      id: 1,
      type: 'order',
      user: 'Sarah Martin',
      action: 'a créé une commande',
      target: '#1567',
      amount: 890,
      time: '2 min',
    },
    {
      id: 2,
      type: 'approval',
      user: 'Vous',
      action: 'avez approuvé une remise pour',
      target: 'Bistrot Moderne',
      time: '15 min',
    },
    {
      id: 3,
      type: 'delivery',
      user: 'Livreur Marc',
      action: 'a livré la commande',
      target: '#1543',
      time: '18 min',
    },
    {
      id: 4,
      type: 'order',
      user: 'Thomas Dubois',
      action: 'a créé une commande',
      target: '#1566',
      amount: 1240,
      time: '22 min',
    },
    {
      id: 5,
      type: 'client',
      user: 'Marie Laurent',
      action: 'a ajouté un nouveau client',
      target: 'Le Gourmet',
      time: '35 min',
    },
  ],
};

export default function SupervisionPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'away'>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTeam = mockData.teamPerformance.filter((member) => {
    if (selectedFilter === 'all') return true;
    return member.status === selectedFilter;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Supervision
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

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-400">
                    Membres d'équipe
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-violet-900 dark:text-violet-100">
                      {mockData.overview.teamMembers}
                    </h3>
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      {mockData.overview.activeToday} actifs
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
                    Actifs aujourd'hui
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {mockData.overview.activeToday}
                    </h3>
                    <span className="text-sm text-slate-500">
                      sur {mockData.overview.teamMembers}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Commandes traitées
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
                    Chiffre d'affaires
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
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Team Performance */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    Performance de l'équipe
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
                      Tous
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
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {member.role}
                            </p>
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
                              {member.orders} commandes
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
                              style={{ width: `${member.performance}%` }}
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

'use client';

import Link from 'next/link';
import {
  TrendingUp,
  Target,
  Calendar,
  Award,
  Zap,
  Phone,
  MapPin,
  FileText,
  QrCode,
  UserPlus,
  Trophy,
  Star,
  ArrowUpRight,
  Activity,
  BarChart3,
  Flame,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/app-layout';
import { cn } from '@/lib/utils';
import { PhonePreviewButton } from '@/components/ui/phone-preview';

// Mock data
const MOCK_DATA = {
  salesRep: {
    name: 'Sophie Martin',
    rank: 2,
    badges: ['Top Performer', 'Deal Closer', 'Rising Star'],
  },
  performance: {
    todayCA: 12580,
    todayCAChange: 15.2,
    monthCA: 185420,
    monthCATarget: 250000,
    orders: 34,
    ordersChange: 8.5,
    conversionRate: 68,
    conversionChange: 12.3,
  },
  objectives: [
    {
      id: 1,
      name: 'CA Mensuel',
      current: 185420,
      target: 250000,
      unit: '€',
      color: 'cyan',
    },
    {
      id: 2,
      name: 'Nouveaux Clients',
      current: 12,
      target: 15,
      unit: 'clients',
      color: 'blue',
    },
    {
      id: 3,
      name: 'Taux de Conversion',
      current: 68,
      target: 75,
      unit: '%',
      color: 'violet',
    },
  ],
  visits: [
    {
      id: 1,
      time: '09:00',
      client: 'Boulangerie du Soleil',
      address: '12 rue de la Paix, Lyon',
      type: 'Visite programmée',
      status: 'pending',
      distance: '2.3 km',
    },
    {
      id: 2,
      time: '11:30',
      client: 'Café Moderne',
      address: '45 avenue Victor Hugo, Lyon',
      type: 'Suivi commande',
      status: 'pending',
      distance: '5.1 km',
    },
    {
      id: 3,
      time: '14:00',
      client: 'Restaurant Le Gourmet',
      address: '8 place Bellecour, Lyon',
      type: 'Démonstration produits',
      status: 'completed',
      distance: '3.7 km',
    },
    {
      id: 4,
      time: '16:30',
      client: 'Pizzeria Roma',
      address: '23 rue Mercière, Lyon',
      type: 'Négociation contrat',
      status: 'pending',
      distance: '4.2 km',
    },
  ],
  prospects: [
    {
      id: 1,
      name: 'Bistro des Halles',
      score: 92,
      potential: 'Élevé',
      interest: 'Produits surgelés premium',
      nextAction: 'Appeler avant 17h',
      lastContact: '2 jours',
      temperature: 'hot',
    },
    {
      id: 2,
      name: 'Traiteur Délices',
      score: 87,
      potential: 'Élevé',
      interest: 'Gamme bio',
      nextAction: 'Envoyer catalogue',
      lastContact: '1 jour',
      temperature: 'hot',
    },
    {
      id: 3,
      name: 'Snack Le Rapide',
      score: 78,
      potential: 'Moyen',
      interest: 'Prix compétitifs',
      nextAction: 'Rendez-vous à fixer',
      lastContact: '5 jours',
      temperature: 'warm',
    },
    {
      id: 4,
      name: 'Hôtel du Parc',
      score: 85,
      potential: 'Élevé',
      interest: 'Service livraison',
      nextAction: 'Présentation offre',
      lastContact: '3 jours',
      temperature: 'hot',
    },
  ],
  leaderboard: [
    {
      id: 1,
      rank: 1,
      name: 'Thomas Dubois',
      ca: 245300,
      orders: 58,
      growth: 22.5,
      avatar: 'TD',
    },
    {
      id: 2,
      rank: 2,
      name: 'Sophie Martin',
      ca: 185420,
      orders: 34,
      growth: 18.2,
      avatar: 'SM',
      isCurrentUser: true,
    },
    {
      id: 3,
      rank: 3,
      name: 'Marc Leroy',
      ca: 178900,
      orders: 42,
      growth: 15.8,
      avatar: 'ML',
    },
    {
      id: 4,
      rank: 4,
      name: 'Julie Bernard',
      ca: 156780,
      orders: 38,
      growth: 12.4,
      avatar: 'JB',
    },
    {
      id: 5,
      rank: 5,
      name: 'Pierre Moreau',
      ca: 142560,
      orders: 31,
      growth: 9.7,
      avatar: 'PM',
    },
  ],
};

export default function CommercialPage() {

  const { salesRep, performance, objectives, visits, prospects, leaderboard } = MOCK_DATA;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Espace Commercial
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <span className="font-medium text-foreground">{salesRep.name}</span>
                <Badge variant="outline" className="ml-2">
                  <Trophy className="h-3 w-3 mr-1" />
                  Rang #{salesRep.rank}
                </Badge>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {salesRep.badges.map((badge, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0"
                >
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CA Today */}
            <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    )}
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +{performance.todayCAChange}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">CA Aujourd'hui</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {performance.todayCA.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CA Month */}
            <Card className="border-cyan-200 dark:border-cyan-900 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400">
                    {Math.round((performance.monthCA / performance.monthCATarget) * 100)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">CA du Mois</p>
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {performance.monthCA.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Objectif: {performance.monthCATarget.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Orders */}
            <Card className="border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                    <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +{performance.ordersChange}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Commandes</p>
                  <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                    {performance.orders}
                  </p>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +{performance.conversionChange}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Taux de Conversion</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {performance.conversionRate}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Objectives Section */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Objectifs du Mois
                </CardTitle>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Février 2026
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {objectives.map((objective) => {
                const progress = Math.round((objective.current / objective.target) * 100);
                const colorClasses = {
                  cyan: 'bg-cyan-500 dark:bg-cyan-600',
                  blue: 'bg-blue-500 dark:bg-blue-600',
                  violet: 'bg-violet-500 dark:bg-violet-600',
                };

                return (
                  <div key={objective.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-3 w-3 rounded-full', colorClasses[objective.color as keyof typeof colorClasses])} />
                        <span className="font-medium">{objective.name}</span>
                      </div>
                      <span className="text-sm font-bold">
                        {objective.current.toLocaleString('fr-FR')} / {objective.target.toLocaleString('fr-FR')} {objective.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                        {progress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Visits */}
            <Card className="border-cyan-200 dark:border-cyan-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Visites du Jour
                  <Badge variant="secondary" className="ml-auto">
                    {visits.filter((v) => v.status === 'pending').length} restantes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className={cn(
                      'p-4 rounded-lg border transition-colors',
                      visit.status === 'completed'
                        ? 'bg-muted/50 border-muted opacity-60'
                        : 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-900'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                          {visit.time}
                        </span>
                        {visit.status === 'completed' && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Fait
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{visit.client}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {visit.address}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {visit.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{visit.distance}</span>
                        </div>
                      </div>
                      {visit.status === 'pending' && (
                        <Button size="sm" variant="outline" className="shrink-0">
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Hot Prospects */}
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Prospects Chauds
                  <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                    {prospects.filter((p) => p.temperature === 'hot').length} opportunités
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      prospect.temperature === 'hot'
                        ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-900'
                        : 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-900'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{prospect.name}</span>
                          {prospect.temperature === 'hot' && (
                            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {prospect.interest}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Score: {prospect.score}/100
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {prospect.potential}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Dernier contact: {prospect.lastContact}
                        </div>
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-1">
                          {prospect.nextAction}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/commercial/prospects">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                      <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">Nouveau Prospect</div>
                      <div className="text-sm text-muted-foreground">Ajouter un contact</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/scan-menu">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                      <QrCode className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">Scanner Menu</div>
                      <div className="text-sm text-muted-foreground">Carte restaurant</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/devis/nouveau">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                      <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">Créer Devis</div>
                      <div className="text-sm text-muted-foreground">Nouvelle offre</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Leaderboard */}
          <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Classement Commercial
                <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                  Top 5 du mois
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((seller) => (
                  <div
                    key={seller.id}
                    className={cn(
                      'p-4 rounded-lg border transition-all',
                      seller.isCurrentUser
                        ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950 border-blue-300 dark:border-blue-700 shadow-md'
                        : 'bg-white/50 dark:bg-slate-900/50 border-muted',
                      seller.rank === 1 && 'ring-2 ring-amber-400 dark:ring-amber-600'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {seller.rank === 1 && (
                            <Crown className="absolute -top-3 -left-2 h-5 w-5 text-amber-500 fill-amber-500" />
                          )}
                          <div
                            className={cn(
                              'w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm',
                              seller.rank === 1 && 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white',
                              seller.rank === 2 && 'bg-gradient-to-br from-gray-300 to-gray-400 text-white',
                              seller.rank === 3 && 'bg-gradient-to-br from-orange-400 to-amber-600 text-white',
                              seller.rank > 3 && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {seller.rank <= 3 ? `#${seller.rank}` : seller.avatar}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {seller.name}
                            {seller.isCurrentUser && (
                              <Badge variant="outline" className="text-xs">
                                Vous
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {seller.orders} commandes
                          </div>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-bold text-lg">
                          {seller.ca.toLocaleString('fr-FR')} €
                        </div>
                        <div className="flex items-center justify-end gap-1 text-sm text-green-600 dark:text-green-400">
                          <ArrowUpRight className="h-3 w-3" />
                          +{seller.growth}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Motivational Footer */}
          <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      Encore {(performance.monthCATarget - performance.monthCA).toLocaleString('fr-FR')} € pour atteindre votre objectif!
                    </div>
                    <div className="text-sm text-blue-100">
                      Vous êtes à {Math.round((performance.monthCA / performance.monthCATarget) * 100)}% de votre objectif mensuel. Continuez comme ça!
                    </div>
                  </div>
                </div>
                <Award className="h-12 w-12 text-white/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

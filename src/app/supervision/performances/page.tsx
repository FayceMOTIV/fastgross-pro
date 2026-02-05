'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Truck,
  Target,
  ShoppingCart,
  UserPlus,
  BarChart3,
  Trophy,
  Medal,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getTeamPerformances,
  TeamPerformance,
} from '@/services/manager-service';

type PeriodFilter = 'week' | 'month' | 'quarter';

export default function PerformancesPage() {
  const [performance, setPerformance] = useState<TeamPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('month');

  useEffect(() => {
    loadPerformances();
  }, [period]);

  const loadPerformances = async () => {
    setIsLoading(true);
    try {
      const data = await getTeamPerformances('manager-1', period);
      setPerformance(data);
    } catch (error) {
      console.error('Erreur chargement performances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm text-muted-foreground font-medium">#{index + 1}</span>;
    }
  };

  if (isLoading || !performance) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/supervision">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Performances</h1>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse h-48 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/supervision">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Performances équipe
                </h1>
                <p className="text-sm text-muted-foreground">{performance.period}</p>
              </div>
            </div>
          </div>

          {/* Period Filter */}
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
            >
              Cette semaine
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              Ce mois
            </Button>
            <Button
              variant={period === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('quarter')}
            >
              Ce trimestre
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-sm">CA Total</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(performance.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">
                sur {formatCurrency(performance.target)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Commandes</span>
              </div>
              <p className="text-2xl font-bold">{performance.ordersCount}</p>
              <p className="text-sm text-muted-foreground">
                Panier moyen: {formatCurrency(performance.avgBasket)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <UserPlus className="h-4 w-4" />
                <span className="text-sm">Nouveaux clients</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{performance.newClients}</p>
              <p className="text-sm text-muted-foreground">
                +{Math.round(performance.newClients / 4)} par semaine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Conversion</span>
              </div>
              <p className="text-2xl font-bold">{performance.conversionRate}%</p>
              <p className="text-sm text-muted-foreground">
                visites → commandes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Progression vers l'objectif</h3>
              <Badge className={cn(
                performance.progress >= 100 ? 'bg-green-500' :
                performance.progress >= 80 ? 'bg-amber-500' :
                'bg-red-500'
              )}>
                {performance.progress}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-4">
              <div
                className={cn(
                  'h-4 rounded-full transition-all duration-500',
                  performance.progress >= 100 ? 'bg-green-500' :
                  performance.progress >= 80 ? 'bg-amber-500' :
                  'bg-red-500'
                )}
                style={{ width: `${Math.min(performance.progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>0€</span>
              <span>{formatCurrency(performance.target)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Commercial Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Classement Commerciaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.commercialRanking.map((commercial, index) => (
                <div
                  key={commercial.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg',
                    index === 0 && 'bg-yellow-50 border border-yellow-200'
                  )}
                >
                  <div className="w-8 flex justify-center">
                    {getRankBadge(index)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{commercial.name}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(commercial.trend)}
                        <Badge
                          variant="outline"
                          className={cn(
                            commercial.percent >= 100 ? 'text-green-600 border-green-300' :
                            commercial.percent >= 80 ? 'text-amber-600 border-amber-300' :
                            'text-red-600 border-red-300'
                          )}
                        >
                          {commercial.percent}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {formatCurrency(commercial.revenue)}
                      </span>
                      <span>{commercial.orders} cmd</span>
                      <span>{commercial.newClients} nouveaux</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          commercial.percent >= 100 ? 'bg-green-500' :
                          commercial.percent >= 80 ? 'bg-amber-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${Math.min(commercial.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Driver Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Classement Livreurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.driverRanking.map((driver, index) => (
                <div
                  key={driver.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg',
                    index === 0 && 'bg-yellow-50 border border-yellow-200'
                  )}
                >
                  <div className="w-8 flex justify-center">
                    {getRankBadge(index)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{driver.name}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(driver.trend)}
                        <Badge
                          variant="outline"
                          className={cn(
                            driver.successRate >= 99 ? 'text-green-600 border-green-300' :
                            driver.successRate >= 97 ? 'text-amber-600 border-amber-300' :
                            'text-red-600 border-red-300'
                          )}
                        >
                          {driver.successRate}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {driver.deliveries} livraisons
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(driver.avgTime)} min moy.
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          driver.successRate >= 99 ? 'bg-green-500' :
                          driver.successRate >= 97 ? 'bg-amber-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${driver.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* KPI Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé des KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {performance.commercialRanking.filter(c => c.percent >= 100).length}
                  <span className="text-lg text-muted-foreground">/{performance.commercialRanking.length}</span>
                </p>
                <p className="text-sm text-muted-foreground">Commerciaux à l'objectif</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {performance.driverRanking.filter(d => d.successRate >= 98).length}
                  <span className="text-lg text-muted-foreground">/{performance.driverRanking.length}</span>
                </p>
                <p className="text-sm text-muted-foreground">Livreurs &gt;98% succès</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">
                  {Math.round(
                    performance.commercialRanking.reduce((acc, c) => acc + c.percent, 0) /
                    performance.commercialRanking.length
                  )}%
                </p>
                <p className="text-sm text-muted-foreground">Moyenne objectif comm.</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">
                  {(
                    performance.driverRanking.reduce((acc, d) => acc + d.successRate, 0) /
                    performance.driverRanking.length
                  ).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Taux succès moyen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

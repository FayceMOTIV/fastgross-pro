'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Target,
  MapPin,
  Trophy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getCommercialStats } from '@/services/commercial-service';

type Period = 'month' | 'quarter' | 'year';

export default function CommercialStatsPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await getCommercialStats(user?.id || 'commercial-1', period);
        setStats(data);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, [user?.id, period]);

  const periodLabels: Record<Period, string> = {
    month: 'Ce mois',
    quarter: 'Ce trimestre',
    year: 'Cette année',
  };

  if (isLoading || !stats) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const progressPercent = Math.min(
    Math.round((stats.revenue.current / stats.revenue.target) * 100),
    100
  );

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5" />
            Mes Performances
          </h1>

          {/* Sélecteur de période */}
          <div className="flex gap-2">
            {(['month', 'quarter', 'year'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Objectif principal */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Objectif {periodLabels[period]}</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  progressPercent >= 80
                    ? 'text-green-600 border-green-200'
                    : progressPercent >= 50
                    ? 'text-amber-600 border-amber-200'
                    : 'text-red-600 border-red-200'
                )}
              >
                {progressPercent}%
              </Badge>
            </div>
            <div className="text-2xl font-bold mb-1">
              {stats.revenue.current.toLocaleString('fr-FR')}€
              <span className="text-base font-normal text-muted-foreground">
                {' '}/ {stats.revenue.target.toLocaleString('fr-FR')}€
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 mb-2">
              <div
                className={cn(
                  'h-3 rounded-full transition-all',
                  progressPercent >= 80
                    ? 'bg-green-500'
                    : progressPercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stats.revenue.growth > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">
                    +{stats.revenue.growth}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">
                    {stats.revenue.growth}%
                  </span>
                </>
              )}
              <span className="text-muted-foreground">
                vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats en grille */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={ShoppingCart}
            label="Commandes"
            value={stats.orders.count}
            subLabel={`Panier moyen: ${stats.orders.avgBasket}€`}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            icon={Users}
            label="Clients actifs"
            value={`${stats.clients.active}/${stats.clients.total}`}
            subLabel={`${stats.clients.newThisPeriod} nouveaux`}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            icon={MapPin}
            label="Visites"
            value={`${stats.visits.completed}/${stats.visits.planned}`}
            subLabel={`Taux: ${stats.visits.successRate}%`}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
          <StatCard
            icon={Target}
            label="Conversion"
            value={`${stats.orders.conversionRate}%`}
            subLabel="Prospects → Clients"
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
        </div>

        {/* Classement équipe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Classement équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {stats.ranking.position}
                  <span className="text-base font-normal text-muted-foreground">
                    /{stats.ranking.total}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.ranking.position === 1
                    ? 'Tu es en tête !'
                    : stats.ranking.position <= 3
                    ? 'Sur le podium !'
                    : 'Continue comme ça !'}
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                  stats.ranking.trend === 'up'
                    ? 'bg-green-100 text-green-700'
                    : stats.ranking.trend === 'down'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {stats.ranking.trend === 'up' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : stats.ranking.trend === 'down' ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
                {stats.ranking.trend === 'up'
                  ? 'En hausse'
                  : stats.ranking.trend === 'down'
                  ? 'En baisse'
                  : 'Stable'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détail clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ClientBar
                label="Actifs"
                count={stats.clients.active}
                total={stats.clients.total}
                color="bg-green-500"
              />
              <ClientBar
                label="À risque"
                count={stats.clients.atRisk}
                total={stats.clients.total}
                color="bg-orange-500"
              />
              <ClientBar
                label="Inactifs"
                count={stats.clients.inactive}
                total={stats.clients.total}
                color="bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  iconColor,
  iconBg,
}: {
  icon: any;
  label: string;
  value: string | number;
  subLabel: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mb-2', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
      </CardContent>
    </Card>
  );
}

function ClientBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = Math.round((count / total) * 100);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn('h-2 rounded-full', color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

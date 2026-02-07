'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronRight,
  AlertTriangle,
  Star,
  Clock,
  Skull,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getMyClients,
  CommercialClient,
  ClientFilters,
} from '@/services/commercial-service';

type FilterStatus = 'all' | 'active' | 'at_risk' | 'inactive';

const FILTER_TABS: { value: FilterStatus; label: string; icon?: any }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'at_risk', label: 'À risque', icon: AlertTriangle },
  { value: 'inactive', label: 'Inactifs', icon: Skull },
];

const PRICE_GRID_STYLES: Record<string, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-gray-100 text-gray-700' },
  premium: { label: 'Premium', className: 'bg-blue-100 text-blue-700' },
  gold: { label: 'Gold', className: 'bg-amber-100 text-amber-700' },
  vip: { label: 'VIP', className: 'bg-purple-100 text-purple-700' },
};

export default function CommercialClientsPage() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadClients = async () => {
    try {
      const filters: ClientFilters = {
        status: activeFilter,
        search: searchQuery || undefined,
        sortBy: 'alerts',
      };
      const data = await getMyClients(user?.id || 'commercial-1', filters);
      setClients(data);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeFilter, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadClients();
  };

  // Compter les clients par statut
  const counts = {
    all: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    at_risk: clients.filter((c) => c.status === 'at_risk').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
  };

  // Filtrer les clients affichés
  const filteredClients =
    activeFilter === 'all'
      ? clients
      : clients.filter((c) => c.status === activeFilter);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 space-y-3">
          {/* Titre et refresh */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Mes Clients</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
              />
            </Button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtres */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {FILTER_TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={activeFilter === tab.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'flex-shrink-0',
                  activeFilter === tab.value && 'shadow-sm'
                )}
              >
                {tab.icon && <tab.icon className="h-3 w-3 mr-1" />}
                {tab.label}
                {tab.value !== 'all' && counts[tab.value] > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 px-1.5 text-xs"
                  >
                    {counts[tab.value]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="p-4 space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun client trouvé</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))
        )}
      </div>
    </div>
  );
}

// Composant carte client
function ClientCard({ client }: { client: CommercialClient }) {
  const gridStyle = PRICE_GRID_STYLES[client.priceGrid] || PRICE_GRID_STYLES.standard;

  const statusDot = {
    active: 'bg-green-500',
    at_risk: 'bg-orange-500',
    inactive: 'bg-red-500',
  };

  return (
    <Link href={`/commercial/clients/${client.id}`}>
      <Card className="hover:bg-muted/50 transition-colors active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status dot */}
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0',
                statusDot[client.status]
              )}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Nom et grille */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold truncate">{client.name}</span>
                <Badge className={cn('text-[10px] px-1.5 py-0', gridStyle.className)}>
                  {gridStyle.label === 'Gold' && <Star className="h-2.5 w-2.5 mr-0.5" />}
                  {gridStyle.label}
                </Badge>
              </div>

              {/* Type et CA */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{client.type}</span>
                <span>•</span>
                <span>{client.yearlyRevenue.toLocaleString('fr-FR')}€/an</span>
              </div>

              {/* Dernière commande */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                <span>
                  Commande :{' '}
                  {client.daysSinceLastOrder !== undefined
                    ? client.daysSinceLastOrder === 0
                      ? "aujourd'hui"
                      : client.daysSinceLastOrder === 1
                      ? 'hier'
                      : `il y a ${client.daysSinceLastOrder}j`
                    : 'jamais'}
                </span>
              </div>

              {/* Alertes */}
              {client.alerts.length > 0 && (
                <div className="space-y-1">
                  {client.alerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-1 rounded',
                        alert.severity === 'high' && 'bg-red-50 text-red-700',
                        alert.severity === 'medium' && 'bg-orange-50 text-orange-700',
                        alert.severity === 'low' && 'bg-yellow-50 text-yellow-700'
                      )}
                    >
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{alert.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

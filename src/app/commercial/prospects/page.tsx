'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Target,
  Phone,
  Navigation,
  Star,
  ChevronRight,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getMyProspects } from '@/services/commercial-service';

interface Prospect {
  id: string;
  name: string;
  type: string;
  score: number;
  address: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
  phone: string;
  distance?: number;
}

export default function CommercialProspectsPage() {
  const { user } = useAuthStore();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProspects = async () => {
    try {
      const data = await getMyProspects(user?.id || 'commercial-1');
      setProspects(data);
    } catch (error) {
      console.error('Erreur chargement prospects:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProspects();
  }, [user?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProspects();
  };

  // Filtrer les prospects
  const filteredProspects = searchQuery
    ? prospects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : prospects;

  // Trier par score
  const sortedProspects = [...filteredProspects].sort((a, b) => b.score - a.score);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Mes Prospects
            </h1>
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un prospect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Liste des prospects */}
      <div className="p-4 space-y-3">
        {sortedProspects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun prospect trouvé</p>
          </div>
        ) : (
          sortedProspects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} />
          ))
        )}
      </div>
    </div>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const scoreColor =
    prospect.score >= 80
      ? 'text-green-600 bg-green-100'
      : prospect.score >= 60
      ? 'text-amber-600 bg-amber-100'
      : 'text-gray-600 bg-gray-100';

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Score */}
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
              scoreColor
            )}
          >
            <span className="font-bold">{prospect.score}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">{prospect.name}</span>
              {prospect.score >= 80 && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {prospect.type}
            </div>
            {prospect.distance && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                À {prospect.distance}m de toi
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Link href={`/commercial/prospects/${prospect.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Voir fiche
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <a href={`tel:${prospect.phone}`}>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${prospect.address.street}, ${prospect.address.postalCode} ${prospect.address.city}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Navigation className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

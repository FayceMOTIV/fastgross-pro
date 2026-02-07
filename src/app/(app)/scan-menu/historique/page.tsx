'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Camera,
  Search,
  TrendingUp,
  FileText,
  ShoppingCart,
  Eye,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Loader2,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getScanHistory, getScanStats } from '@/services/scan-history-service';
import { ScanHistoryItem, ScanHistoryStats } from '@/types/scan-history';

const TYPE_ICONS: Record<string, string> = {
  kebab: '🥙',
  burger: '🍔',
  tacos: '🌮',
  pizza: '🍕',
  snack: '🍽️',
};

const DEPOT_LABELS: Record<string, string> = {
  lyon: 'Lyon',
  montpellier: 'Montpellier',
  bordeaux: 'Bordeaux',
};

export default function ScanHistoriquePage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [stats, setStats] = useState<ScanHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterDepot, setFilterDepot] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterDepot]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        getScanHistory({
          type: filterType || undefined,
          depot: filterDepot || undefined,
          searchQuery: searchQuery || undefined,
        }),
        getScanStats(filterDepot || undefined),
      ]);
      setScans(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const filteredScans = searchQuery
    ? scans.filter(scan =>
        scan.client?.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.restaurant.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : scans;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusBadge = (scan: ScanHistoryItem) => {
    if (scan.commandeConvertie) {
      return <Badge className="bg-green-100 text-green-800">Commande</Badge>;
    }
    if (scan.devisGenere) {
      return <Badge className="bg-blue-100 text-blue-800">Devis envoyé</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">En attente</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        title="Historique des Scans"
        subtitle="Retrouvez tous vos scans menu et leur conversion"
        actions={
          <Button
            onClick={() => router.push('/scan-menu')}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <Camera className="w-4 h-4" />
            Nouveau Scan
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.totalScans}</p>
                    <p className="text-orange-100 text-sm">Total scans</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.scansAujourdhui}</p>
                    <p className="text-gray-500 text-sm">Aujourd'hui</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.tauxConversion}%</p>
                    <p className="text-gray-500 text-sm">Taux conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.tauxCommande}%</p>
                    <p className="text-gray-500 text-sm">Devis → Commande</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalCAGenere)}</p>
                    <p className="text-gray-500 text-sm">CA généré</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Rechercher par client, type de restaurant..."
                  className="pl-10"
                />
              </div>

              {/* Type filter */}
              <div className="flex gap-2">
                {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(filterType === type ? null : type)}
                    className={filterType === type ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  >
                    {icon}
                  </Button>
                ))}
              </div>

              {/* Depot filter */}
              <select
                value={filterDepot || ''}
                onChange={(e) => setFilterDepot(e.target.value || null)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Tous les dépôts</option>
                {Object.entries(DEPOT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Scan List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Scans récents ({filteredScans.length})
              </span>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-orange-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && scans.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 mx-auto text-orange-600 animate-spin mb-4" />
                <p className="text-gray-500">Chargement de l'historique...</p>
              </div>
            ) : filteredScans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Aucun scan trouvé</p>
                <p className="text-sm">Commencez par scanner un menu</p>
                <Button
                  onClick={() => router.push('/scan-menu')}
                  className="mt-4 bg-orange-600 hover:bg-orange-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Scanner un menu
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-4 bg-white border rounded-xl hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => router.push(`/scan-menu/historique/${scan.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {TYPE_ICONS[scan.restaurant.type] || '🍽️'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="font-semibold text-gray-900 truncate">
                              {scan.client?.nom || 'Client non renseigné'}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <span className="capitalize">{scan.restaurant.type}</span>
                              {scan.restaurant.specialite && (
                                <span className="text-gray-400">• {scan.restaurant.specialite}</span>
                              )}
                            </p>
                          </div>
                          {getStatusBadge(scan)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(scan.dateCreation)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {DEPOT_LABELS[scan.depot] || scan.depot}
                          </span>
                          {scan.client?.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {scan.client.telephone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-500">{scan.platsDetectes.length} plats</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">{scan.nbProduits} produits</span>
                          </div>
                          <div className="flex-1" />
                          <span className="font-bold text-orange-600 text-lg">
                            {formatCurrency(scan.totalTTC)}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Quick actions on hover */}
                    <div className="flex gap-2 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                      {!scan.devisGenere && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Logique pour créer un devis
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Créer devis
                        </Button>
                      )}
                      {scan.devisGenere && !scan.commandeConvertie && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/devis/${scan.devisId}`);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Voir devis
                        </Button>
                      )}
                      {scan.commandeConvertie && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/orders/${scan.commandeId}`);
                          }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Voir commande
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type breakdown */}
        {stats && stats.typesRestaurants.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Répartition par type de restaurant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.typesRestaurants.map((item) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-2xl w-8">{TYPE_ICONS[item.type] || '🍽️'}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize text-gray-900">{item.type}</span>
                        <span className="text-sm text-gray-500">{item.count} scans ({item.pourcentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all"
                          style={{ width: `${item.pourcentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

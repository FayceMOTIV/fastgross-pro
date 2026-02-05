'use client';

/**
 * Dashboard Analytics - DISTRAM
 * Graphiques et KPIs avec Recharts
 */

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Euro,
  Package,
  Target,
  PieChart as PieChartIcon,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import {
  MOCK_STATS,
  MOCK_CA_MONTHLY,
  MOCK_TOP_CLIENTS,
  MOCK_TOP_COMMERCIALS,
  MOCK_CLIENTS_BY_TYPE,
  MOCK_COMMANDES_BY_STATUS,
} from '@/data/mock-analytics';

// Couleurs du thème DISTRAM
const COLORS = {
  primary: '#ea580c',
  secondary: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  lyon: '#ea580c',
  montpellier: '#0ea5e9',
  bordeaux: '#8b5cf6',
};

const PIE_COLORS = ['#ea580c', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  preparation: 'Préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const TYPE_LABELS: Record<string, string> = {
  kebab: 'Kebab',
  tacos: 'Tacos',
  pizza: 'Pizza',
  burger: 'Burger',
  snack: 'Snack',
  restaurant: 'Restaurant',
};

export default function AnalyticsPage() {
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        title="Analytics"
        subtitle="Performance DISTRAM en temps réel"
        actions={
          <div className="flex gap-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range as typeof dateRange)}
                className={dateRange === range ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : range === '90d' ? '3 mois' : '1 an'}
              </Button>
            ))}
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Chiffre d'Affaires"
            value={formatCurrency(MOCK_STATS.caTotal)}
            evolution={18.5}
            icon={Euro}
            color="orange"
          />
          <KPICard
            title="Commandes"
            value={MOCK_STATS.totalCommandes.toString()}
            evolution={12.3}
            icon={ShoppingCart}
            color="blue"
          />
          <KPICard
            title="Clients Actifs"
            value={MOCK_STATS.clientsActifs.toString()}
            evolution={8.2}
            icon={Users}
            color="green"
          />
          <KPICard
            title="Panier Moyen"
            value={formatCurrency(MOCK_STATS.panierMoyen)}
            evolution={5.8}
            icon={Package}
            color="purple"
          />
        </div>

        {/* CA par dépôt */}
        <div className="grid lg:grid-cols-3 gap-4">
          <DepotCard depot="Lyon" ca={MOCK_STATS.caLyon} color={COLORS.lyon} percent={50} />
          <DepotCard depot="Montpellier" ca={MOCK_STATS.caMontpellier} color={COLORS.montpellier} percent={30} />
          <DepotCard depot="Bordeaux" ca={MOCK_STATS.caBordeaux} color={COLORS.bordeaux} percent={20} />
        </div>

        {/* Graphiques principaux */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* CA par mois */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Évolution du CA par dépôt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={MOCK_CA_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="lyon"
                    name="Lyon"
                    stackId="1"
                    stroke={COLORS.lyon}
                    fill={COLORS.lyon}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="montpellier"
                    name="Montpellier"
                    stackId="1"
                    stroke={COLORS.montpellier}
                    fill={COLORS.montpellier}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="bordeaux"
                    name="Bordeaux"
                    stackId="1"
                    stroke={COLORS.bordeaux}
                    fill={COLORS.bordeaux}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Répartition par type */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-orange-600" />
                Clients par type de restaurant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={MOCK_CLIENTS_BY_TYPE}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${TYPE_LABELS[name] || name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {MOCK_CLIENTS_BY_TYPE.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} clients`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Statuts commandes & Top commerciaux */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Statuts commandes */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                Statut des commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={MOCK_COMMANDES_BY_STATUS} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => STATUS_LABELS[v] || v}
                    width={80}
                  />
                  <Tooltip formatter={(value: number) => `${value} commandes`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {MOCK_COMMANDES_BY_STATUS.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === 'livree' ? COLORS.success
                          : entry.name === 'annulee' ? COLORS.danger
                          : entry.name === 'en_attente' ? COLORS.warning
                          : COLORS.secondary
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top commerciaux */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Performance commerciaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_TOP_COMMERCIALS.map((commercial, index) => (
                  <div key={commercial.nom} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{commercial.nom}</p>
                      <p className="text-sm text-gray-500">
                        {commercial.clients} clients • {commercial.commandes} commandes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(commercial.ca)}</p>
                      <p className="text-xs text-gray-500">CA annuel</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top clients */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Top 10 Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dépôt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Commandes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Panier Moy.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">CA Annuel</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Compte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {MOCK_TOP_CLIENTS.map((client, index) => (
                    <tr key={client.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.nom}</p>
                        <p className="text-xs text-gray-500">{client.ville}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{client.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            client.depot === 'lyon' ? 'bg-orange-100 text-orange-800'
                            : client.depot === 'montpellier' ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                          }
                        >
                          {client.depot.charAt(0).toUpperCase() + client.depot.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{client.nbCommandes}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(client.panierMoyen)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{formatCurrency(client.caAnnuel)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={
                            client.accountType === 'gold' ? 'bg-yellow-100 text-yellow-800'
                            : client.accountType === 'silver' ? 'bg-gray-100 text-gray-800'
                            : client.accountType === 'bronze' ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                          }
                        >
                          {client.accountType.charAt(0).toUpperCase() + client.accountType.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANTS
// ============================================

function KPICard({
  title,
  value,
  evolution,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  evolution: number;
  icon: any;
  color: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const isPositive = evolution >= 0;

  return (
    <Card className="shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(evolution)}%
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DepotCard({
  depot,
  ca,
  color,
  percent,
}: {
  depot: string;
  ca: number;
  color: string;
  percent: number;
}) {
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-5 h-5" style={{ color }} />
            <span className="font-semibold text-gray-900">{depot}</span>
            <Badge style={{ backgroundColor: `${color}20`, color }}>{percent}%</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(ca)}</p>
          <p className="text-sm text-gray-500">Chiffre d'affaires</p>
        </div>
        <div className="h-2" style={{ backgroundColor: color }} />
      </CardContent>
    </Card>
  );
}

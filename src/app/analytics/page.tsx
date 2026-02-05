"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Percent,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Mock Analytics Data
const kpiData = [
  {
    title: "Revenu Total",
    value: "724,830",
    currency: true,
    change: 12.5,
    positive: true,
    icon: DollarSign,
    color: "violet",
    description: "vs mois dernier",
  },
  {
    title: "Commandes",
    value: "2,847",
    change: 8.3,
    positive: true,
    icon: ShoppingBag,
    color: "blue",
    description: "vs mois dernier",
  },
  {
    title: "Panier Moyen",
    value: "254.50",
    currency: true,
    change: 3.2,
    positive: true,
    icon: CreditCard,
    color: "emerald",
    description: "vs mois dernier",
  },
  {
    title: "Taux de Croissance",
    value: "18.4",
    suffix: "%",
    change: 2.1,
    positive: false,
    icon: Percent,
    color: "amber",
    description: "vs mois dernier",
  },
];

const revenueData = [
  { month: "Jan", revenue: 42500 },
  { month: "Fév", revenue: 48200 },
  { month: "Mar", revenue: 51800 },
  { month: "Avr", revenue: 47300 },
  { month: "Mai", revenue: 54600 },
  { month: "Juin", revenue: 58900 },
  { month: "Juil", revenue: 62400 },
  { month: "Août", revenue: 55200 },
  { month: "Sept", revenue: 67800 },
  { month: "Oct", revenue: 72100 },
  { month: "Nov", revenue: 78500 },
  { month: "Déc", revenue: 85200 },
];

const topProducts = [
  { name: "Viande Kebab Premium", sales: 45200, orders: 856, trend: 12.5 },
  { name: "Fromage Mozzarella", sales: 38900, orders: 742, trend: 8.3 },
  { name: "Pain Pita Frais", sales: 32100, orders: 1205, trend: -3.2 },
  { name: "Sauce Blanche Maison", sales: 28700, orders: 923, trend: 15.7 },
  { name: "Frites Surgelées", sales: 25400, orders: 689, trend: 5.1 },
];

const topClients = [
  { name: "Le Kebab du Coin", location: "Paris 18e", revenue: 45200, orders: 124, trend: 18.5 },
  { name: "Pizza Express", location: "Lyon 2e", revenue: 38900, orders: 98, trend: 12.3 },
  { name: "Burger House", location: "Marseille 1er", revenue: 32100, orders: 87, trend: -5.2 },
  { name: "Tacos King", location: "Toulouse 3e", revenue: 28700, orders: 76, trend: 22.1 },
  { name: "Snack Gourmet", location: "Nice 6e", revenue: 25400, orders: 65, trend: 8.7 },
];

const regionData = [
  { region: "Île-de-France", revenue: 285400, percentage: 39.4 },
  { region: "Auvergne-Rhône-Alpes", revenue: 178900, percentage: 24.7 },
  { region: "Provence-Alpes-Côte d'Azur", revenue: 142600, percentage: 19.7 },
  { region: "Occitanie", revenue: 78500, percentage: 10.8 },
  { region: "Autres régions", revenue: 39430, percentage: 5.4 },
];

type DateRange = "7d" | "30d" | "90d" | "12m";

const dateRangeLabels: Record<DateRange, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
  "12m": "12 derniers mois",
};

interface KPICardProps {
  title: string;
  value: string;
  currency?: boolean;
  suffix?: string;
  change: number;
  positive: boolean;
  icon: React.ElementType;
  color: string;
  description: string;
}

function KPICard({
  title,
  value,
  currency,
  suffix,
  change,
  positive,
  icon: Icon,
  color,
  description,
}: KPICardProps) {
  const colorClasses = {
    violet: "from-violet-500 to-purple-600",
    blue: "from-blue-500 to-cyan-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {currency && "€"}
              {value}
              {suffix}
            </p>
          </div>
          <div
            className={cn(
              "p-3 rounded-xl bg-gradient-to-br shadow-lg",
              `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {positive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                positive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {positive ? "+" : ""}
              {change}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </CardContent>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
          colorClasses[color as keyof typeof colorClasses]
        )}
      />
    </Card>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Vue d'ensemble de vos performances et métriques clés
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {dateRangeLabels[dateRange]}
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                  {(Object.keys(dateRangeLabels) as DateRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setShowDatePicker(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        dateRange === range
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {dateRangeLabels[range]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Évolution du Chiffre d'Affaires</CardTitle>
                <CardDescription>Performance mensuelle sur 12 mois</CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  +18.5% YoY
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenueData.map((item, index) => {
                const percentage = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-12">
                        {item.month}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 flex items-center justify-end pr-3 group-hover:from-violet-600 group-hover:to-purple-700"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Products & Top Clients */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Produits</CardTitle>
              <CardDescription>Produits les plus vendus par CA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {product.orders} commandes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(product.sales)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        {product.trend >= 0 ? (
                          <ChevronUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            product.trend >= 0 ? "text-emerald-500" : "text-red-500"
                          )}
                        >
                          {Math.abs(product.trend)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Clients</CardTitle>
              <CardDescription>Clients les plus rentables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topClients.map((client, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {client.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {client.location} • {client.orders} commandes
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(client.revenue)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        {client.trend >= 0 ? (
                          <ChevronUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            client.trend >= 0 ? "text-emerald-500" : "text-red-500"
                          )}
                        >
                          {Math.abs(client.trend)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Répartition Géographique</CardTitle>
                <CardDescription>Distribution du CA par région</CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  5 régions
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionData.map((region, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {region.region}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatCurrency(region.revenue)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                        {region.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

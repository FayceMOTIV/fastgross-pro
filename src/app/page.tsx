"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Euro,
  ShoppingCart,
  Truck,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  ChevronRight,
  Download,
  RefreshCw,
  Zap,
  Sparkles,
  Activity,
  Bell,
  BarChart3,
  Target,
  Award,
  Star,
  ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { cn, formatCurrency } from "@/lib/utils";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Types
interface StatCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: "violet" | "emerald" | "amber" | "rose" | "blue" | "cyan";
  trend: "up" | "down";
  sparklineData: number[];
}

interface Order {
  id: string;
  client: string;
  clientInitials: string;
  clientColor: string;
  amount: number;
  status: "pending" | "preparing" | "delivering" | "delivered" | "cancelled";
  time: string;
  items: number;
  progress: number;
}

interface Driver {
  id: string;
  name: string;
  initials: string;
  status: "online" | "busy" | "offline";
  deliveries: number;
  location: string;
  color: string;
  rating: number;
}

interface TopClient {
  id: string;
  name: string;
  initials: string;
  revenue: number;
  orders: number;
  trend: number;
  color: string;
}

interface Alert {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
  time: string;
}

// Mock Data
const stats: StatCard[] = [
  {
    title: "Chiffre d'affaires",
    value: "€47,850",
    change: 12.5,
    changeLabel: "vs hier",
    icon: Euro,
    color: "emerald",
    trend: "up",
    sparklineData: [30, 45, 35, 50, 49, 60, 70, 91, 85, 95],
  },
  {
    title: "Commandes",
    value: "156",
    change: 8.2,
    changeLabel: "vs hier",
    icon: ShoppingCart,
    color: "blue",
    trend: "up",
    sparklineData: [20, 35, 45, 30, 55, 65, 50, 70, 60, 80],
  },
  {
    title: "Livraisons",
    value: "142",
    change: 15.4,
    changeLabel: "vs hier",
    icon: Truck,
    color: "violet",
    trend: "up",
    sparklineData: [40, 35, 50, 45, 60, 55, 70, 65, 80, 90],
  },
  {
    title: "Nouveaux clients",
    value: "23",
    change: 18.7,
    changeLabel: "vs semaine",
    icon: Users,
    color: "amber",
    trend: "up",
    sparklineData: [10, 15, 20, 18, 25, 30, 28, 35, 40, 45],
  },
];

const recentOrders: Order[] = [
  { id: "ORD-2847", client: "Le Kebab Royal", clientInitials: "KR", clientColor: "from-amber-500 to-orange-600", amount: 847.50, status: "delivering", time: "Il y a 12 min", items: 24, progress: 75 },
  { id: "ORD-2846", client: "Pizza Express", clientInitials: "PE", clientColor: "from-red-500 to-rose-600", amount: 1250.00, status: "preparing", time: "Il y a 25 min", items: 36, progress: 45 },
  { id: "ORD-2845", client: "Burger House", clientInitials: "BH", clientColor: "from-violet-500 to-purple-600", amount: 623.80, status: "pending", time: "Il y a 32 min", items: 18, progress: 10 },
  { id: "ORD-2844", client: "Snack Gourmet", clientInitials: "SG", clientColor: "from-cyan-500 to-blue-600", amount: 445.20, status: "delivered", time: "Il y a 45 min", items: 12, progress: 100 },
  { id: "ORD-2843", client: "La Bonne Assiette", clientInitials: "BA", clientColor: "from-emerald-500 to-teal-600", amount: 892.00, status: "delivered", time: "Il y a 1h", items: 28, progress: 100 },
];

const drivers: Driver[] = [
  { id: "1", name: "Marc Dupont", initials: "MD", status: "online", deliveries: 8, location: "Vannes Centre", color: "bg-gradient-to-br from-emerald-500 to-teal-600", rating: 4.9 },
  { id: "2", name: "Pierre Martin", initials: "PM", status: "busy", deliveries: 12, location: "Zone Commerciale", color: "bg-gradient-to-br from-blue-500 to-indigo-600", rating: 4.8 },
  { id: "3", name: "Sophie Bernard", initials: "SB", status: "online", deliveries: 6, location: "Port de Vannes", color: "bg-gradient-to-br from-violet-500 to-purple-600", rating: 5.0 },
  { id: "4", name: "Lucas Petit", initials: "LP", status: "offline", deliveries: 0, location: "—", color: "bg-gradient-to-br from-slate-400 to-slate-500", rating: 4.7 },
];

const topClients: TopClient[] = [
  { id: "1", name: "Le Kebab Royal", initials: "KR", revenue: 12450, orders: 48, trend: 15, color: "bg-gradient-to-br from-amber-400 to-orange-500" },
  { id: "2", name: "Pizza Express", initials: "PE", revenue: 9870, orders: 36, trend: 8, color: "bg-gradient-to-br from-red-400 to-rose-500" },
  { id: "3", name: "Burger House", initials: "BH", revenue: 7650, orders: 28, trend: 22, color: "bg-gradient-to-br from-violet-400 to-purple-500" },
  { id: "4", name: "Snack Gourmet", initials: "SG", revenue: 5420, orders: 22, trend: 12, color: "bg-gradient-to-br from-cyan-400 to-blue-500" },
];

const recentAlerts: Alert[] = [
  { id: "1", type: "success", message: "Nouveau client Pizza Pro ajouté", time: "Il y a 5 min" },
  { id: "2", type: "warning", message: "Stock faible: Sauce tomate", time: "Il y a 15 min" },
  { id: "3", type: "info", message: "Marc Dupont a terminé sa tournée", time: "Il y a 30 min" },
];

// Revenue chart data
const chartData = [
  { day: "Lun", value: 4200, orders: 45 },
  { day: "Mar", value: 5800, orders: 62 },
  { day: "Mer", value: 4900, orders: 53 },
  { day: "Jeu", value: 7200, orders: 78 },
  { day: "Ven", value: 8500, orders: 92 },
  { day: "Sam", value: 9800, orders: 108 },
  { day: "Dim", value: 6400, orders: 71 },
];

const maxValue = Math.max(...chartData.map((d) => d.value));

// Mini Sparkline Component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (value / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="w-24 h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color === "emerald" ? "#10b981" : color === "blue" ? "#3b82f6" : color === "violet" ? "#8b5cf6" : "#f59e0b"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color === "emerald" ? "#10b981" : color === "blue" ? "#3b82f6" : color === "violet" ? "#8b5cf6" : "#f59e0b"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color === "emerald" ? "#10b981" : color === "blue" ? "#3b82f6" : color === "violet" ? "#8b5cf6" : "#f59e0b"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Components
function StatCardComponent({ stat, index }: { stat: StatCard; index: number }) {
  const colorClasses = {
    violet: {
      bg: "bg-violet-500/10",
      icon: "text-violet-500",
      border: "border-violet-500/20",
      glow: "shadow-violet-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-500",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      icon: "text-amber-500",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/20",
    },
    rose: {
      bg: "bg-rose-500/10",
      icon: "text-rose-500",
      border: "border-rose-500/20",
      glow: "shadow-rose-500/20",
    },
    blue: {
      bg: "bg-blue-500/10",
      icon: "text-blue-500",
      border: "border-blue-500/20",
      glow: "shadow-blue-500/20",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      icon: "text-cyan-500",
      border: "border-cyan-500/20",
      glow: "shadow-cyan-500/20",
    },
  };

  const colors = colorClasses[stat.color];

  return (
    <div
      className={cn(
        "relative bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50",
        "hover:shadow-xl transition-all duration-500 group overflow-hidden",
        "hover:-translate-y-1 backdrop-blur-sm"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Glow Effect */}
      <div className={cn(
        "absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl",
        colors.bg
      )} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl", colors.bg)}>
            <stat.icon className={cn("h-6 w-6", colors.icon)} />
          </div>
          <Sparkline data={stat.sparklineData} color={stat.color} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold",
              stat.trend === "up"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
            )}
          >
            {stat.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(stat.change)}%
          </span>
          <span className="text-xs text-slate-500">{stat.changeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status, progress }: { status: Order["status"]; progress: number }) {
  const config = {
    pending: { label: "En attente", icon: Clock, class: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400", progressColor: "bg-amber-500" },
    preparing: { label: "Préparation", icon: Package, class: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", progressColor: "bg-blue-500" },
    delivering: { label: "Livraison", icon: Truck, class: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400", progressColor: "bg-violet-500" },
    delivered: { label: "Livrée", icon: CheckCircle2, class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400", progressColor: "bg-emerald-500" },
    cancelled: { label: "Annulée", icon: XCircle, class: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400", progressColor: "bg-rose-500" },
  };

  const { label, icon: Icon, class: className, progressColor } = config[status];

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold", className)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function DriverStatusDot({ status }: { status: Driver["status"] }) {
  const colors = {
    online: "bg-emerald-500",
    busy: "bg-amber-500",
    offline: "bg-slate-400",
  };

  return (
    <span className="relative flex h-3 w-3">
      {status === "online" && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex rounded-full h-3 w-3", colors[status])} />
    </span>
  );
}

function AlertIcon({ type }: { type: Alert["type"] }) {
  const config = {
    success: { icon: CheckCircle2, class: "text-emerald-500 bg-emerald-500/10" },
    warning: { icon: Zap, class: "text-amber-500 bg-amber-500/10" },
    error: { icon: XCircle, class: "text-rose-500 bg-rose-500/10" },
    info: { icon: Bell, class: "text-blue-500 bg-blue-500/10" },
  };

  const { icon: Icon, class: className } = config[type];

  return (
    <div className={cn("p-2 rounded-xl", className)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [greeting, setGreeting] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-full">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Live Dashboard</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, Mohamed
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {currentTime} — Voici votre activité en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
            {["day", "week", "month"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedPeriod === period
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {period === "day" ? "Jour" : period === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
            <RefreshCw className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
            <Download className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <StatCardComponent key={i} stat={stat} index={i} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Performance de la semaine
              </h2>
              <p className="text-sm text-slate-500 mt-1">Chiffre d&apos;affaires et commandes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">CA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Commandes</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-72 flex items-end justify-between gap-3">
            {chartData.map((data, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex flex-col items-center relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap z-10">
                    {formatCurrency(data.value)} • {data.orders} cmd
                  </div>
                  <div className="w-full flex gap-1">
                    <div
                      className="flex-1 bg-gradient-to-t from-violet-600 to-purple-500 rounded-t-lg transition-all duration-500 group-hover:from-violet-500 group-hover:to-purple-400"
                      style={{ height: `${(data.value / maxValue) * 200}px` }}
                    />
                    <div
                      className="flex-1 bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-lg transition-all duration-500 group-hover:from-cyan-500 group-hover:to-blue-400"
                      style={{ height: `${(data.orders / 120) * 200}px` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">{data.day}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900 dark:text-white">€46,800</p>
              <p className="text-sm text-slate-500">Total semaine</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">+18.5%</p>
              <p className="text-sm text-slate-500">vs semaine dernière</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900 dark:text-white">509</p>
              <p className="text-sm text-slate-500">Commandes total</p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Clients */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Top Clients
              </h2>
              <Link
                href="/clients"
                className="text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-medium"
              >
                Voir tous
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {topClients.map((client, i) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-black text-slate-600 dark:text-slate-300">
                    {i + 1}
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg", client.color)}>
                    {client.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500">{client.orders} commandes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(client.revenue)}
                    </p>
                    <span className={cn(
                      "text-xs font-bold",
                      client.trend > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {client.trend > 0 ? "+" : ""}{client.trend}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Activité récente
              </h2>
              <Link href="/alerts" className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium">
                Tout voir
              </Link>
            </div>

            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <AlertIcon type={alert.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{alert.message}</p>
                    <p className="text-xs text-slate-400">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Commandes récentes
            </h2>
            <Link
              href="/orders"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
            >
              Voir toutes
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-lg", order.clientColor)}>
                  {order.clientInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {order.client}
                    </p>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {order.id}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {order.items} articles • {order.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">
                    {formatCurrency(order.amount)}
                  </p>
                  <OrderStatusBadge status={order.status} progress={order.progress} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drivers */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-violet-500" />
                Équipe de livraison
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                <span className="text-emerald-600 font-semibold">{drivers.filter((d) => d.status !== "offline").length}</span> livreurs actifs
              </p>
            </div>
            <Link
              href="/tracking"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Carte live
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="relative">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg", driver.color)}>
                    {driver.initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-800 rounded-full shadow">
                    <DriverStatusDot status={driver.status} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {driver.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{driver.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {driver.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {driver.deliveries} <span className="text-sm font-normal text-slate-500">livraisons</span>
                  </p>
                  <p className={cn(
                    "text-sm font-medium",
                    driver.status === "online" ? "text-emerald-600" : driver.status === "busy" ? "text-amber-600" : "text-slate-400"
                  )}>
                    {driver.status === "online" ? "Disponible" : driver.status === "busy" ? "En cours" : "Hors ligne"}
                  </p>
                </div>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <Phone className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ShoppingCart, label: "Nouvelle commande", href: "/orders/new", color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/25" },
          { icon: Users, label: "Ajouter client", href: "/clients/new", color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/25" },
          { icon: Package, label: "Gérer catalogue", href: "/catalogues", color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25" },
          { icon: Zap, label: "Voir alertes", href: "/alerts", color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/25" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 backdrop-blur-sm"
          >
            <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white shadow-lg", action.color, action.shadow)}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {action.label}
            </span>
            <ArrowRight className="h-5 w-5 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="mt-8 relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBoLTQweiIvPjxwYXRoIGQ9Ik00MCAwdjQwSDBWMGg0MHpNMSAxdjM4aDM4VjFIMXoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Target className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black">Objectif du mois</h3>
              <p className="text-white/80">Vous êtes à 78% de votre objectif de €60,000</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-4xl font-black">€46,800</p>
              <p className="text-white/80">sur €60,000</p>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${78 * 2.51} ${100 * 2.51}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black">78%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}

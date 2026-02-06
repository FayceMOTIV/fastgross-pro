'use client';

import Link from 'next/link';
import { Users, Truck, BarChart3, Settings, ShoppingCart, Building2, Camera, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const modes = [
  {
    name: 'Commercial',
    description: 'CRM, clients, scan menu IA',
    href: '/commercial',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/25',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-500/10',
    badge: null,
  },
  {
    name: 'Livreur',
    description: 'Tournées, livraisons, GPS',
    href: '/livreur',
    icon: Truck,
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/25',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
    badge: null,
  },
  {
    name: 'Manager',
    description: 'Supervision, équipe, stats',
    href: '/supervision',
    icon: BarChart3,
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/25',
    hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-500/10',
    badge: null,
  },
  {
    name: 'Admin',
    description: 'Paramètres, utilisateurs',
    href: '/settings',
    icon: Settings,
    gradient: 'from-slate-500 to-slate-700',
    shadow: 'shadow-slate-500/25',
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-500/10',
    badge: null,
  },
  {
    name: 'Client B2B',
    description: 'Commander en ligne 24h/24',
    href: '/portail',
    icon: ShoppingCart,
    gradient: 'from-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/25',
    hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-500/10',
    badge: '98 produits',
  },
];

const quickActions = [
  {
    name: 'Scan Menu IA',
    description: 'Analysez un menu et créez un devis',
    href: '/scan-menu',
    icon: Camera,
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    name: 'Analytics',
    description: 'Tableaux de bord et KPIs',
    href: '/analytics',
    icon: BarChart3,
    gradient: 'from-cyan-500 to-blue-600',
  },
];

export function ModeSelector() {
  return (
    <section className="py-6">
      {/* Main Modes */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
            <Building2 className="h-5 w-5" />
          </div>
          Accès rapide aux modules
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Sélectionnez votre espace de travail
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {modes.map((mode) => (
          <Link
            key={mode.name}
            href={mode.href}
            className={cn(
              "relative flex flex-col items-center p-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50",
              "transition-all duration-300 group overflow-hidden backdrop-blur-sm",
              "hover:shadow-xl hover:-translate-y-1",
              mode.hoverBg
            )}
          >
            {/* Badge */}
            {mode.badge && (
              <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                {mode.badge}
              </span>
            )}

            {/* Glow effect on hover */}
            <div className={cn(
              "absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl",
              `bg-gradient-to-br ${mode.gradient}`
            )} style={{ opacity: 0.2 }} />

            <div className={cn(
              "relative p-4 rounded-2xl bg-gradient-to-br text-white shadow-lg mb-4 transition-transform group-hover:scale-110",
              mode.gradient,
              mode.shadow
            )}>
              <mode.icon className="h-6 w-6" />
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-center">
              {mode.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1 line-clamp-2">
              {mode.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all group"
          >
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-105",
              action.gradient
            )}>
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {action.name}
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

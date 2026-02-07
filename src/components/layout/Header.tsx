'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import {
  Search,
  Bell,
  ChevronDown,
  Building2
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuth();
  const [notifications] = useState([
    { id: 1, title: 'Alerte churn: Kebab Istanbul', type: 'warning' },
    { id: 2, title: 'Stock faible: Sauce blanche', type: 'danger' },
    { id: 3, title: 'Nouvelle commande: Pizza Roma', type: 'info' },
  ]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="pl-10 w-64"
          />
        </div>

        {/* Depot selector */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {user?.depot === 'lyon' && 'Lyon'}
            {user?.depot === 'montpellier' && 'Montpellier'}
            {user?.depot === 'bordeaux' && 'Bordeaux'}
            {!user?.depot && 'Tous les dépôts'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Quick action */}
        {actions}
      </div>
    </header>
  );
}

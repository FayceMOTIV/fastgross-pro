'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  MapPin,
  Camera,
  Target,
  Shield,
  Route,
  Package,
  MessageSquare,
  FileText,
  Building2,
  MessageCircle,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const mainNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Commandes', href: '/orders', icon: ShoppingCart },
  { name: 'Tracking', href: '/tracking', icon: MapPin },
];

const aiNav = [
  { name: 'Scan Menu', href: '/scan-menu', icon: Camera },
  { name: 'Prospection', href: '/prospects', icon: Target },
  { name: 'Anti-Churn', href: '/anti-churn', icon: Shield },
  { name: 'Tournées', href: '/tournees', icon: Route },
  { name: 'Stocks', href: '/stocks', icon: Package },
  { name: 'Assistant', href: '/assistant', icon: MessageSquare },
];

const secondaryNav = [
  { name: 'Devis', href: '/devis', icon: FileText },
  { name: 'Supervision', href: '/supervision', icon: Building2 },
  { name: 'Messagerie', href: '/chat', icon: MessageCircle },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        <Link href="/app" className="flex items-center gap-2">
          <span className="text-xl font-bold text-orange-600">DISTRAM</span>
        </Link>
        <Link href="/" className="text-xs text-gray-400 hover:text-orange-600 transition-colors">
          ← Site
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main */}
        <div className="space-y-1">
          {mainNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* AI Section */}
        <div className="mt-6">
          <div className="px-3 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Intelligence Artificielle
            </span>
          </div>
          <div className="space-y-1">
            {aiNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                <span className="ml-auto text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                  IA
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Secondary */}
        <div className="mt-6">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Autres
            </span>
          </div>
          <div className="space-y-1">
            {secondaryNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 font-semibold">
              {user?.displayName?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role || 'commercial'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  MapPin,
  MessageSquare,
  User,
  Home,
  Users,
  ShoppingCart,
  Target,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/roles';

interface MobileNavProps {
  role: UserRole;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Navigation par rôle
const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  livreur: [
    { href: '/livreur', label: 'Livr.', icon: Package },
    { href: '/livreur/map', label: 'Carte', icon: MapPin },
    { href: '/livreur/messages', label: 'Messages', icon: MessageSquare },
    { href: '/livreur/profile', label: 'Profil', icon: User },
  ],
  commercial: [
    { href: '/commercial', label: 'Accueil', icon: Home },
    { href: '/commercial/clients', label: 'Clients', icon: Users },
    { href: '/commercial/map', label: 'Carte', icon: MapPin },
    { href: '/commercial/prospects', label: 'Prospects', icon: Target },
    { href: '/commercial/profile', label: 'Profil', icon: User },
  ],
  client: [
    { href: '/portail', label: 'Accueil', icon: Home },
    { href: '/portail/catalogue', label: 'Catalogue', icon: Package },
    { href: '/portail/commandes', label: 'Commandes', icon: ShoppingCart },
    { href: '/portail/factures', label: 'Factures', icon: FileText },
    { href: '/portail/profile', label: 'Compte', icon: User },
  ],
  // Admin et Manager n'utilisent pas la nav mobile
  admin: [],
  manager: [],
};

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] || [];

  if (items.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          // Vérifier si c'est la route active
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`)) ||
            (item.href === `/${role}` && pathname === `/${role}`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full',
                'text-muted-foreground transition-colors active:scale-95',
                isActive && 'text-primary'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-110'
                )}
              />
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium',
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>
              {/* Indicateur actif */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Safe area for iOS */}
      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </nav>
  );
}

// Composant pour le header mobile spécifique à chaque mode
export function MobileHeader({ role }: { role: UserRole }) {
  const titles: Record<UserRole, string> = {
    livreur: 'Mes livraisons',
    commercial: 'Espace Commercial',
    client: 'Mon Compte',
    admin: 'Administration',
    manager: 'Supervision',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <Package className="h-4 w-4 text-white" />
      </div>
      <div>
        <span className="font-semibold text-lg">FastGross</span>
        <span className="text-xs text-muted-foreground ml-2">{titles[role]}</span>
      </div>
    </div>
  );
}

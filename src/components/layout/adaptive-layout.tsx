'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Package, Bell, Menu, LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore, useNotificationStore } from '@/stores';
import Sidebar from './Sidebar';
import { MobileNav } from './mobile-nav';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MODE_CONFIGS, ROLE_LABELS, UserRole } from '@/types/roles';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen } = useUIStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [mounted, setMounted] = useState(false);

  // Déterminer le rôle de l'utilisateur
  const role = (user?.role || 'commercial') as UserRole;
  const config = MODE_CONFIGS[role] || MODE_CONFIGS.commercial;
  const roleInfo = ROLE_LABELS[role];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    logout();
    window.location.href = '/login';
  };

  const recentNotifications = notifications.slice(0, 5);

  // Page de login - pas de layout
  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Chargement...</div>
      </div>
    );
  }

  // ===== MODE MOBILE (Livreur, Commercial) =====
  if (config.layout === 'mobile') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header mobile simplifié */}
        <header className="sticky top-0 z-50 bg-background border-b h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href={config.homePath} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">FastGross</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentNotifications.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Aucune notification
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className={cn(
                        'flex flex-col items-start gap-1 cursor-pointer',
                        !notif.read && 'bg-primary/5'
                      )}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <span className="font-medium text-sm">{notif.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {notif.body}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu utilisateur */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 hover:bg-muted rounded-lg transition-colors">
                  <UserAvatar
                    user={{ name: user?.displayName || 'Utilisateur', avatar: user?.avatar }}
                    size="sm"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.displayName || 'Utilisateur'}</span>
                    <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                      <span>{roleInfo.icon}</span>
                      <span>{roleInfo.label}</span>
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      Mode sombre
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Mode clair
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 overflow-auto pb-20">{children}</main>

        {/* Navigation bottom */}
        {config.showBottomNav && <MobileNav role={role} />}
      </div>
    );
  }

  // ===== MODE DESKTOP (Admin, Manager) =====
  if (config.layout === 'desktop') {
    return (
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        {config.showSidebar && (
          <Sidebar />
        )}

        {/* Main content */}
        <div className={cn(config.showSidebar && 'lg:pl-64')}>
          {/* Header Desktop */}
          <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-lg border-b border-border">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Breadcrumb ou titre */}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={roleInfo.color}>{roleInfo.icon}</span>
                  <span>Mode {roleInfo.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:underline"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recentNotifications.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Aucune notification
                      </div>
                    ) : (
                      recentNotifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className={cn(
                            'flex flex-col items-start gap-1 cursor-pointer',
                            !notif.read && 'bg-primary/5'
                          )}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <span className="font-medium">{notif.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {notif.body}
                          </span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User */}
                <div className="flex items-center gap-3 pl-3 border-l border-border">
                  <UserAvatar
                    user={{ name: user?.displayName || 'Utilisateur', avatar: user?.avatar }}
                    size="sm"
                  />
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{user?.displayName || 'Utilisateur'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{roleInfo.icon}</span>
                      <span>{roleInfo.label}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    );
  }

  // ===== MODE RESPONSIVE (Client B2B) =====
  return (
    <div className="min-h-screen bg-background">
      {/* Header responsive */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto h-14 flex items-center justify-between px-4">
          <Link href={config.homePath} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">FastGross</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-muted rounded-lg">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentNotifications.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Aucune notification
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{notif.title}</span>
                        <span className="text-xs text-muted-foreground">{notif.body}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-muted rounded-lg">
                  <UserAvatar
                    user={{ name: user?.displayName || 'Client', avatar: user?.avatar }}
                    size="sm"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.displayName || 'Client'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Portail Client B2B
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      Mode sombre
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Mode clair
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto p-4 pb-20 md:pb-6">{children}</main>

      {/* Mobile nav - hidden on desktop */}
      <div className="md:hidden">
        <MobileNav role={role} />
      </div>
    </div>
  );
}

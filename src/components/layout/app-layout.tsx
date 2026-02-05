"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  MapPin,
  Truck,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  BarChart3,
  Target,
  UserCheck,
  Megaphone,
  HelpCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, useNotificationStore } from "@/stores";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  color?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/", color: "text-violet-500" },
      { icon: ShoppingCart, label: "Commandes", href: "/orders", color: "text-blue-500" },
      { icon: Users, label: "Clients", href: "/clients", color: "text-emerald-500" },
      { icon: Package, label: "Catalogues", href: "/catalogues", color: "text-amber-500" },
    ],
  },
  {
    title: "Opérations",
    items: [
      { icon: Truck, label: "Livraisons", href: "/livreur", color: "text-cyan-500" },
      { icon: MapPin, label: "Tracking", href: "/tracking", color: "text-rose-500" },
      { icon: MessageSquare, label: "Messages", href: "/chat", color: "text-indigo-500" },
    ],
  },
  {
    title: "Commercial",
    items: [
      { icon: Target, label: "Prospects", href: "/prospects", color: "text-orange-500" },
      { icon: UserCheck, label: "Commercial", href: "/commercial", color: "text-teal-500" },
      { icon: Megaphone, label: "Marketing", href: "/marketing", color: "text-pink-500" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/analytics", color: "text-purple-500" },
      { icon: Zap, label: "Alertes", href: "/alerts", color: "text-red-500" },
      { icon: Settings, label: "Paramètres", href: "/settings", color: "text-slate-500" },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ui-storage");
    if (savedTheme) {
      try {
        const { state } = JSON.parse(savedTheme);
        document.documentElement.setAttribute("data-theme", state.theme || "light");
      } catch (e) {
        document.documentElement.setAttribute("data-theme", "light");
      }
    }
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
          collapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  DISTRAM
                </span>
                <span className="text-[10px] text-slate-400 -mt-1">by Face Media</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        "group relative",
                        active
                          ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-400"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-r-full" />
                      )}
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 transition-colors",
                          active ? "text-violet-600 dark:text-violet-400" : item.color
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            {!collapsed && <span className="text-sm text-slate-500">Thème</span>}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 text-slate-600" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
            </button>
          </div>

          {/* Collapse Button - Desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Réduire</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:ml-20" : "lg:ml-72"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 w-80">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher clients, commandes..."
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
                />
                <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium text-slate-400 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                  ⌘K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="relative p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

              <button className="flex items-center gap-3 p-1.5 pr-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <span className="text-sm font-bold text-white">MD</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Mohamed D.</p>
                  <p className="text-xs text-slate-500">Directeur</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

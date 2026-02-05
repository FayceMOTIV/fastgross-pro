"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Bell,
  AlertTriangle,
  Info,
  Package,
  CreditCard,
  ShoppingCart,
  Settings as SettingsIcon,
  Check,
  X,
  Eye,
  ChevronRight,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

type AlertType = "stock" | "payment" | "order" | "system";
type AlertSeverity = "critical" | "warning" | "info";
type FilterTab = "all" | "critical" | "warning" | "info";

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionLabel?: string;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "stock",
    severity: "warning",
    title: "Stock faible - Produit XYZ",
    message: "Le produit XYZ n'a plus que 5 unités en stock. Réapprovisionnement recommandé.",
    time: "Il y a 5 minutes",
    isRead: false,
    actionLabel: "Réapprovisionner",
  },
  {
    id: "2",
    type: "payment",
    severity: "critical",
    title: "Paiement en retard - Client ABC",
    message: "La facture #2024-001 du client ABC est en retard de 15 jours. Montant: 2,450 MAD",
    time: "Il y a 15 minutes",
    isRead: false,
    actionLabel: "Relancer",
  },
  {
    id: "3",
    type: "order",
    severity: "info",
    title: "Nouvelle commande #CMD-2024-0156",
    message: "Une nouvelle commande de 8,750 MAD a été passée par le client FastFood Pro.",
    time: "Il y a 30 minutes",
    isRead: false,
    actionLabel: "Voir détails",
  },
  {
    id: "4",
    type: "stock",
    severity: "critical",
    title: "Rupture de stock - Produit ABC",
    message: "Le produit ABC est en rupture de stock. 3 commandes en attente.",
    time: "Il y a 1 heure",
    isRead: false,
    actionLabel: "Commander",
  },
  {
    id: "5",
    type: "payment",
    severity: "warning",
    title: "Échéance proche - Client XYZ Corp",
    message: "La facture #2024-015 arrive à échéance dans 3 jours. Montant: 5,200 MAD",
    time: "Il y a 2 heures",
    isRead: true,
    actionLabel: "Rappeler",
  },
  {
    id: "6",
    type: "order",
    severity: "info",
    title: "Commande expédiée #CMD-2024-0148",
    message: "La commande du client Restaurant Le Parisien a été expédiée.",
    time: "Il y a 3 heures",
    isRead: true,
    actionLabel: "Tracker",
  },
  {
    id: "7",
    type: "system",
    severity: "info",
    title: "Mise à jour système disponible",
    message: "Une nouvelle version du système est disponible avec des améliorations de performance.",
    time: "Il y a 5 heures",
    isRead: true,
    actionLabel: "Installer",
  },
  {
    id: "8",
    type: "payment",
    severity: "critical",
    title: "Facture impayée - Client DEF",
    message: "La facture #2024-008 est impayée depuis 30 jours. Montant: 12,300 MAD",
    time: "Il y a 1 jour",
    isRead: true,
    actionLabel: "Action urgente",
  },
  {
    id: "9",
    type: "stock",
    severity: "warning",
    title: "Stock critique - Catégorie Boissons",
    message: "Plusieurs produits de la catégorie Boissons ont un stock critique.",
    time: "Il y a 1 jour",
    isRead: true,
    actionLabel: "Vérifier",
  },
];

const alertTypeConfig = {
  stock: {
    icon: Package,
    label: "Stock",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  payment: {
    icon: CreditCard,
    label: "Paiement",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700",
  },
  order: {
    icon: ShoppingCart,
    label: "Commande",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  system: {
    icon: SettingsIcon,
    label: "Système",
    bgColor: "bg-gray-100 dark:bg-gray-800/50",
    iconColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-300 dark:border-gray-700",
  },
};

const severityConfig = {
  critical: {
    badge: "Critique",
    badgeColor: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  warning: {
    badge: "Attention",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  info: {
    badge: "Info",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    stock: true,
    payment: true,
    order: true,
    system: true,
    email: true,
    push: true,
    sound: false,
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === "all") return true;
    return alert.severity === activeTab;
  });

  const getCategoryCount = (severity: AlertSeverity | "all") => {
    if (severity === "all") return alerts.length;
    return alerts.filter((a) => a.severity === severity).length;
  };

  const handleMarkAsRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  };

  const handleDismiss = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const handleMarkAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
  };

  const handleAction = (alert: Alert) => {
    console.log("Action triggered for alert:", alert.id);
    handleMarkAsRead(alert.id);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Centre d'alertes
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Gérez toutes vos notifications en un seul endroit
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Tout marquer lu
              </Button>
            )}
            <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  Paramètres
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Préférences d'alertes</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Types d'alertes
                  </p>
                </div>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.stock}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, stock: checked }))
                  }
                >
                  <Package className="h-4 w-4 mr-2 text-amber-600" />
                  Alertes de stock
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.payment}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, payment: checked }))
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2 text-red-600" />
                  Alertes de paiement
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.order}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, order: checked }))
                  }
                >
                  <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" />
                  Nouvelles commandes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.system}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, system: checked }))
                  }
                >
                  <SettingsIcon className="h-4 w-4 mr-2 text-gray-600" />
                  Alertes système
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Notifications
                  </p>
                </div>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.email}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, email: checked }))
                  }
                >
                  Notifications email
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.push}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, push: checked }))
                  }
                >
                  Notifications push
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={notificationSettings.sound}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, sound: checked }))
                  }
                >
                  Sons de notification
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              activeTab === "all" && "ring-2 ring-violet-500 dark:ring-violet-400"
            )}
            onClick={() => setActiveTab("all")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {getCategoryCount("all")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {unreadCount} non lues
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              activeTab === "critical" && "ring-2 ring-red-500 dark:ring-red-400"
            )}
            onClick={() => setActiveTab("critical")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Critiques
                  </p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {getCategoryCount("critical")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Action immédiate requise
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              activeTab === "warning" && "ring-2 ring-amber-500 dark:ring-amber-400"
            )}
            onClick={() => setActiveTab("warning")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Attention
                  </p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {getCategoryCount("warning")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Surveillance recommandée
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              activeTab === "info" && "ring-2 ring-blue-500 dark:ring-blue-400"
            )}
            onClick={() => setActiveTab("info")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Informations
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {getCategoryCount("info")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Pour information
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
          <div className="flex items-center gap-1 flex-1">
            {[
              { value: "all", label: "Toutes", count: getCategoryCount("all") },
              { value: "critical", label: "Critiques", count: getCategoryCount("critical") },
              { value: "warning", label: "Attention", count: getCategoryCount("warning") },
              { value: "info", label: "Info", count: getCategoryCount("info") },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as FilterTab)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.value
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span>{tab.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-2",
                    activeTab === tab.value
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Aucune alerte
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Vous n'avez aucune alerte dans cette catégorie.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert) => {
              const typeConfig = alertTypeConfig[alert.type];
              const severityConfig_ = severityConfig[alert.severity];
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "transition-all hover:shadow-md border-l-4",
                    typeConfig.borderColor,
                    !alert.isRead && "bg-violet-50/50 dark:bg-violet-950/20"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          typeConfig.bgColor
                        )}
                      >
                        <TypeIcon className={cn("h-6 w-6", typeConfig.iconColor)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {alert.title}
                              </h3>
                              {!alert.isRead && (
                                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {alert.message}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("flex-shrink-0", severityConfig_.badgeColor)}
                          >
                            {severityConfig_.badge}
                          </Badge>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{alert.time}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {!alert.isRead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAsRead(alert.id)}
                                className="h-8 px-3 gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Marquer lu
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDismiss(alert.id)}
                              className="h-8 px-3 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <X className="h-3.5 w-3.5" />
                              Ignorer
                            </Button>
                            {alert.actionLabel && (
                              <Button
                                size="sm"
                                onClick={() => handleAction(alert)}
                                className="h-8 px-3 gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                              >
                                {alert.actionLabel}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Empty State when no alerts at all */}
        {alerts.length === 0 && (
          <Card>
            <CardContent className="py-24 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
                <Bell className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Aucune alerte pour le moment
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Vous êtes à jour ! Toutes vos alertes ont été traitées.
                Vous serez notifié dès qu'une nouvelle alerte apparaîtra.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

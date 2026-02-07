"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCircle2, ChevronRight,
  TrendingUp, FileText, Clock, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCardCompact } from "./alert-card";
import {
  getAllUnifiedAlerts,
  type UnifiedAlert,
} from "@/services/alert-notification-service";

interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
  behavior: number;
  invoice: number;
}

export function AlertsSummaryWidget() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    resolved: 0,
    behavior: 0,
    invoice: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAlerts = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);

    try {
      const data = await getAllUnifiedAlerts();
      setAlerts(data);

      // Calculate stats
      setStats({
        total: data.length,
        critical: data.filter((a) => a.severity === "critical").length,
        warning: data.filter((a) => a.severity === "warning").length,
        info: data.filter((a) => a.severity === "info").length,
        resolved: data.filter((a) => a.status === "resolved").length,
        behavior: data.filter((a) => a.category === "behavior").length,
        invoice: data.filter((a) => a.category === "invoice").length,
      });
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const criticalAlerts = alerts.filter((a) => a.severity === "critical").slice(0, 3);
  const hasUrgent = stats.critical > 0;

  return (
    <Card className={cn("transition-all", hasUrgent && "border-l-4 border-l-red-500")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className={cn("h-5 w-5", hasUrgent ? "text-red-500" : "text-muted-foreground")} />
            Alertes à traiter
            {stats.critical > 0 && (
              <Badge variant="danger" className="animate-pulse">
                {stats.critical} urgent{stats.critical > 1 ? "es" : "e"}
              </Badge>
            )}
          </CardTitle>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadAlerts(true)}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-red-50">
            <p className="text-xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-50">
            <p className="text-xl font-bold text-orange-600">{stats.warning}</p>
            <p className="text-xs text-muted-foreground">Attention</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50">
            <p className="text-xl font-bold text-blue-600">{stats.info}</p>
            <p className="text-xs text-muted-foreground">Info</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-50">
            <p className="text-xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">Résolues</p>
          </div>
        </div>

        {/* Alert Type Summary */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-sm">{stats.behavior} comportement</span>
          </div>
          <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="text-sm">{stats.invoice} factures</span>
          </div>
        </div>

        {/* Critical Alerts */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : criticalAlerts.length > 0 ? (
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <AlertCardCompact
                key={alert.id}
                alert={alert}
                onClick={() => router.push(`/alerts?id=${alert.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Aucune alerte critique</p>
          </div>
        )}

        {/* View All Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => router.push("/alerts")}
        >
          Voir toutes les alertes ({stats.total})
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Mini version for sidebar or header
export function AlertsBadge() {
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const loadCount = async () => {
      const alerts = await getAllUnifiedAlerts();
      setCount(alerts.filter((a) => a.severity === "critical" || a.severity === "warning").length);
    };
    loadCount();
  }, []);

  if (count === 0) return null;

  return (
    <button
      onClick={() => router.push("/alerts")}
      className="relative p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
}

// Task Summary for sidebar
export function TasksSummaryMini() {
  const [pendingCount] = useState(3); // Mock

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-800">
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">{pendingCount} tâches en attente</span>
    </div>
  );
}

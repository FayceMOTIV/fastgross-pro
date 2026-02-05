"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, Mail, CheckCircle2, Clock, ChevronDown,
  ChevronUp, User, TrendingDown, Package, AlertTriangle,
  FileText, Calendar, MessageSquare, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UnifiedAlert } from "@/services/alert-notification-service";

interface AlertCardProps {
  alert: UnifiedAlert;
  onCall?: (alert: UnifiedAlert) => void;
  onEmail?: (alert: UnifiedAlert) => void;
  onMarkResolved?: (alert: UnifiedAlert) => void;
  onAssign?: (alert: UnifiedAlert) => void;
  onPostpone?: (alert: UnifiedAlert) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  product_missing: Package,
  quantity_drop: TrendingDown,
  frequency_change: Clock,
  stopped_ordering: AlertTriangle,
  unusual_order: Package,
  invoice_overdue: FileText,
  invoice_due_soon: Calendar,
  payment_promise_broken: AlertTriangle,
  dispute: MessageSquare,
};

const typeLabels: Record<string, string> = {
  product_missing: "Produit manquant",
  quantity_drop: "Baisse quantité",
  frequency_change: "Changement fréquence",
  stopped_ordering: "Client inactif",
  unusual_order: "Commande inhabituelle",
  invoice_overdue: "Facture impayée",
  invoice_due_soon: "Échéance proche",
  payment_promise_broken: "Promesse non tenue",
  dispute: "Litige",
};

const severityConfig = {
  critical: {
    color: "border-red-500 bg-red-50",
    badgeColor: "bg-red-500",
    textColor: "text-red-700",
    icon: "🔴",
    label: "Critique",
  },
  warning: {
    color: "border-orange-500 bg-orange-50",
    badgeColor: "bg-orange-500",
    textColor: "text-orange-700",
    icon: "🟠",
    label: "Attention",
  },
  info: {
    color: "border-blue-500 bg-blue-50",
    badgeColor: "bg-blue-500",
    textColor: "text-blue-700",
    icon: "🟡",
    label: "Info",
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
}

export function AlertCard({
  alert,
  onCall,
  onEmail,
  onMarkResolved,
  onAssign,
  onPostpone,
}: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);

  const config = severityConfig[alert.severity];
  const Icon = typeIcons[alert.type] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
    >
      <Card className={cn("border-l-4 transition-shadow hover:shadow-md", config.color)}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", config.badgeColor, "bg-opacity-20")}>
                <Icon className={cn("h-5 w-5", config.textColor)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("text-xs font-semibold uppercase", config.textColor)}>
                    {config.icon} {config.label}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {typeLabels[alert.type] || alert.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(alert.detectedAt)}
                  </span>
                </div>

                <h3 className="font-semibold text-sm">
                  {alert.clientName}
                  {alert.title && ` - ${alert.title}`}
                </h3>
              </div>
            </div>

            {alert.amount && (
              <div className="text-right shrink-0">
                <p className="text-lg font-bold">{alert.amount.toLocaleString()}€</p>
                {alert.daysOverdue && alert.daysOverdue > 0 && (
                  <p className="text-xs text-red-600">
                    +{alert.daysOverdue} jours
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-3">
            {alert.description}
          </p>

          {/* Behavior comparison (for behavior alerts) */}
          {(alert.previousBehavior || alert.currentBehavior) && (
            <div className="mb-3 p-3 bg-white/50 rounded-lg space-y-1">
              {alert.previousBehavior && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Avant : </span>
                  <span className="font-medium">{alert.previousBehavior}</span>
                </p>
              )}
              {alert.currentBehavior && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Maintenant : </span>
                  <span className="font-medium text-red-600">{alert.currentBehavior}</span>
                </p>
              )}
            </div>
          )}

          {/* Suggested Action */}
          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg mb-3">
            <span className="text-lg">💡</span>
            <p className="text-sm text-primary-800">
              <span className="font-medium">Suggestion : </span>
              {alert.suggestedAction}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onCall?.(alert)}
              className="gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onEmail?.(alert)}
              className="gap-1"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkResolved?.(alert)}
              className="gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Traité
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="ml-auto gap-1"
            >
              {expanded ? (
                <>
                  Moins <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Plus <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Expanded Section */}
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-border"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assigné à</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {alert.assignedTo || "Non assigné"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssign?.(alert)}
                      className="h-6 px-2 text-xs"
                    >
                      Modifier
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statut</p>
                  <Badge
                    variant={
                      alert.status === "resolved"
                        ? "default"
                        : alert.status === "contacted"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {alert.status === "new" && "Nouveau"}
                    {alert.status === "acknowledged" && "Vu"}
                    {alert.status === "contacted" && "Contacté"}
                    {alert.status === "resolved" && "Résolu"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPostpone?.(alert)}
                  className="gap-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Reporter
                </Button>
                <Button variant="ghost" size="sm" className="gap-1">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  Historique
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Compact version for dashboard widget
export function AlertCardCompact({
  alert,
  onClick,
}: {
  alert: UnifiedAlert;
  onClick?: () => void;
}) {
  const config = severityConfig[alert.severity];
  const Icon = typeIcons[alert.type] || AlertTriangle;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border-l-4 transition-colors hover:bg-muted/50",
        config.color
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-4 w-4 mt-0.5", config.textColor)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{alert.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {alert.description}
          </p>
        </div>
        {alert.amount && (
          <span className="text-sm font-semibold shrink-0">
            {alert.amount.toLocaleString()}€
          </span>
        )}
      </div>
    </button>
  );
}

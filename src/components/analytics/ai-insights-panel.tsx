"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, AlertTriangle, TrendingUp, Zap,
  RefreshCw, ChevronRight, X, Sparkles, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/services/insights-service";

// Mock insights for initial display
const mockInsights: AIInsight[] = [
  {
    id: "1",
    type: "risk",
    title: "3 clients inactifs depuis 30+ jours",
    description: "Tacos Avenue, La Friterie et Burger Express n'ont pas commandé. Risque de perte: 90 000€/an",
    impact: "high",
    suggestedActions: [
      "Appeler Tacos Avenue pour comprendre la situation",
      "Proposer une remise exceptionnelle de 15%",
      "Planifier une visite commerciale cette semaine",
    ],
    relatedData: { clientCount: 3, potentialLoss: 90000 },
    createdAt: new Date(),
  },
  {
    id: "2",
    type: "opportunity",
    title: "Upsell potentiel: Napoli Pizza",
    description: "Ce client commande régulièrement des produits italiens mais pas d'huile d'olive premium. Potentiel +350€/mois",
    impact: "medium",
    suggestedActions: [
      "Proposer l'huile d'olive premium lors de la prochaine commande",
      "Créer un bundle 'Pack Italien' avec remise",
      "Offrir un échantillon gratuit",
    ],
    relatedData: { clientName: "Napoli Pizza", monthlyPotential: 350 },
    createdAt: new Date(),
  },
  {
    id: "3",
    type: "trend",
    title: "Pic de demande kebab prévu",
    description: "Basé sur les données historiques, prévision d'une hausse de 30% sur les produits kebab dans les 2 prochaines semaines",
    impact: "high",
    suggestedActions: [
      "Augmenter le stock de viande kebab de 30%",
      "Contacter les fournisseurs pour disponibilité",
      "Informer les clients de la disponibilité garantie",
    ],
    relatedData: { expectedIncrease: 30, products: ["Viande kebab", "Pain pita", "Sauce"] },
    createdAt: new Date(),
  },
  {
    id: "4",
    type: "action",
    title: "Optimisation prix: Huile de friture",
    description: "Prix actuel 15.90€ vs moyenne concurrents 15.50€. Suggéré: 15.20€ pour gagner en compétitivité tout en gardant 38% de marge",
    impact: "medium",
    suggestedActions: [
      "Ajuster le prix à 15.20€",
      "Tester sur un segment de 10 clients",
      "Mesurer l'impact sur les volumes après 2 semaines",
    ],
    relatedData: { currentPrice: 15.90, suggestedPrice: 15.20, margin: 38 },
    createdAt: new Date(),
  },
  {
    id: "5",
    type: "opportunity",
    title: "Nouveau prospect qualifié",
    description: "Tacos King (Nice) a un score IA de 85%. Forte probabilité de conversion si contact rapide",
    impact: "high",
    suggestedActions: [
      "Appeler dans les 24h",
      "Préparer une offre de bienvenue personnalisée",
      "Proposer une visite de présentation",
    ],
    relatedData: { prospectName: "Tacos King", score: 85, city: "Nice" },
    createdAt: new Date(),
  },
];

const typeConfig = {
  opportunity: {
    icon: Lightbulb,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    label: "Opportunité",
  },
  risk: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    label: "Risque",
  },
  trend: {
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
    label: "Tendance",
  },
  action: {
    icon: Zap,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-200",
    label: "Action",
  },
};

const impactConfig = {
  high: { color: "bg-red-500", label: "Élevé" },
  medium: { color: "bg-amber-500", label: "Moyen" },
  low: { color: "bg-green-500", label: "Faible" },
};

interface InsightCardProps {
  insight: AIInsight;
  onDismiss: (id: string) => void;
  onAction: (action: string) => void;
}

function InsightCard({ insight, onDismiss, onAction }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[insight.type];
  const impact = impactConfig[insight.impact];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("border-l-4", config.borderColor, "hover:shadow-md transition-shadow")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {config.label}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs">
                      <span className={cn("w-2 h-2 rounded-full", impact.color)} />
                      Impact {impact.label.toLowerCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                </div>
                <button
                  onClick={() => onDismiss(insight.id)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors shrink-0"
                  aria-label="Ignorer"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {insight.description}
              </p>

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-2"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
                {expanded ? "Masquer" : "Voir"} les actions suggérées
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {insight.suggestedActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => onAction(action)}
                          className="w-full text-left p-2 text-sm rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium shrink-0">
                            {index + 1}
                          </span>
                          {action}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function InsightSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded" />
            </div>
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsight[]>(mockInsights);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<AIInsight["type"] | "all">("all");

  const filteredInsights = insights.filter(
    (insight) => filter === "all" || insight.type === filter
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // In production, this would call getAllInsights()
    setInsights([...mockInsights].sort(() => Math.random() - 0.5));
    setIsLoading(false);
  };

  const handleDismiss = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAction = (action: string) => {
    // In production, this would trigger the action
    console.log("Action triggered:", action);
  };

  const insightCounts = {
    all: insights.length,
    opportunity: insights.filter((i) => i.type === "opportunity").length,
    risk: insights.filter((i) => i.type === "risk").length,
    trend: insights.filter((i) => i.type === "trend").length,
    action: insights.filter((i) => i.type === "action").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Insights IA
                <Badge variant="secondary" className="font-normal">
                  {insights.length} actifs
                </Badge>
              </CardTitle>
              <CardDescription>
                Analyses et recommandations automatiques
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            {isLoading ? "Analyse..." : "Actualiser"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(["all", "risk", "opportunity", "trend", "action"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === type
                  ? "bg-primary-600 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {type === "all" ? "Tous" : typeConfig[type].label}
              <span className="ml-1 opacity-70">({insightCounts[type]})</span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <>
                <InsightSkeleton />
                <InsightSkeleton />
                <InsightSkeleton />
              </>
            ) : filteredInsights.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun insight de ce type</p>
              </motion.div>
            ) : (
              filteredInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismiss}
                  onAction={handleAction}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-600">
                {insightCounts.risk}
              </p>
              <p className="text-xs text-muted-foreground">Risques</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {insightCounts.opportunity}
              </p>
              <p className="text-xs text-muted-foreground">Opportunités</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {insightCounts.trend}
              </p>
              <p className="text-xs text-muted-foreground">Tendances</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {insightCounts.action}
              </p>
              <p className="text-xs text-muted-foreground">Actions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

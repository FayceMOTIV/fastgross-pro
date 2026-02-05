"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Bell,
  Target,
  DollarSign,
  Users,
  BarChart3,
  Plus,
  Send,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Types
interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "scheduled";
  reach: number;
  budget: number;
  spent: number;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
  channel: "email" | "sms" | "push" | "multi";
  startDate: string;
  endDate: string;
}

interface ChannelPerformance {
  channel: string;
  icon: any;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
  trend: number;
}

interface ABTest {
  id: string;
  name: string;
  status: "running" | "completed";
  variantA: {
    name: string;
    sent: number;
    conversions: number;
    conversionRate: number;
  };
  variantB: {
    name: string;
    sent: number;
    conversions: number;
    conversionRate: number;
  };
  winner?: "A" | "B";
}

// Mock Data
const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Offre Découverte Printemps",
    status: "active",
    reach: 12500,
    budget: 5000,
    spent: 3200,
    performance: {
      impressions: 45200,
      clicks: 2850,
      conversions: 425,
      ctr: 6.3,
      conversionRate: 14.9,
    },
    channel: "multi",
    startDate: "2026-01-15",
    endDate: "2026-02-28",
  },
  {
    id: "2",
    name: "Newsletter Hebdomadaire",
    status: "active",
    reach: 8900,
    budget: 1200,
    spent: 980,
    performance: {
      impressions: 8900,
      clicks: 1245,
      conversions: 187,
      ctr: 14.0,
      conversionRate: 15.0,
    },
    channel: "email",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    id: "3",
    name: "Promo Flash Weekend",
    status: "scheduled",
    reach: 15000,
    budget: 3000,
    spent: 0,
    performance: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversionRate: 0,
    },
    channel: "sms",
    startDate: "2026-02-07",
    endDate: "2026-02-09",
  },
  {
    id: "4",
    name: "Réactivation Clients",
    status: "active",
    reach: 4200,
    budget: 1500,
    spent: 890,
    performance: {
      impressions: 4200,
      clicks: 580,
      conversions: 95,
      ctr: 13.8,
      conversionRate: 16.4,
    },
    channel: "email",
    startDate: "2026-01-20",
    endDate: "2026-02-20",
  },
  {
    id: "5",
    name: "Nouveaux Produits",
    status: "paused",
    reach: 6500,
    budget: 2000,
    spent: 1150,
    performance: {
      impressions: 18900,
      clicks: 945,
      conversions: 112,
      ctr: 5.0,
      conversionRate: 11.9,
    },
    channel: "push",
    startDate: "2026-01-10",
    endDate: "2026-02-15",
  },
  {
    id: "6",
    name: "Fidélité Premium",
    status: "completed",
    reach: 3200,
    budget: 800,
    spent: 800,
    performance: {
      impressions: 3200,
      clicks: 512,
      conversions: 89,
      ctr: 16.0,
      conversionRate: 17.4,
    },
    channel: "email",
    startDate: "2025-12-15",
    endDate: "2026-01-15",
  },
];

const channelPerformance: ChannelPerformance[] = [
  {
    channel: "Email",
    icon: Mail,
    sent: 45600,
    delivered: 44890,
    opened: 15912,
    clicked: 2385,
    openRate: 35.5,
    clickRate: 15.0,
    trend: 5.2,
  },
  {
    channel: "SMS",
    icon: MessageSquare,
    sent: 12400,
    delivered: 12280,
    opened: 10840,
    clicked: 1520,
    openRate: 88.3,
    clickRate: 14.0,
    trend: -2.1,
  },
  {
    channel: "Push",
    icon: Bell,
    sent: 28900,
    delivered: 25200,
    opened: 8820,
    clicked: 1145,
    openRate: 35.0,
    clickRate: 13.0,
    trend: 8.7,
  },
];

const abTests: ABTest[] = [
  {
    id: "1",
    name: "Email Subject Line",
    status: "running",
    variantA: {
      name: "Offre -15% ce weekend",
      sent: 2500,
      conversions: 385,
      conversionRate: 15.4,
    },
    variantB: {
      name: "Flash Sale: 15% de réduction",
      sent: 2500,
      conversions: 445,
      conversionRate: 17.8,
    },
  },
  {
    id: "2",
    name: "CTA Button Color",
    status: "completed",
    variantA: {
      name: "Green Button",
      sent: 3000,
      conversions: 420,
      conversionRate: 14.0,
    },
    variantB: {
      name: "Pink Button",
      sent: 3000,
      conversions: 510,
      conversionRate: 17.0,
    },
    winner: "B",
  },
  {
    id: "3",
    name: "Email Send Time",
    status: "completed",
    variantA: {
      name: "9h00 AM",
      sent: 4000,
      conversions: 640,
      conversionRate: 16.0,
    },
    variantB: {
      name: "6h00 PM",
      sent: 4000,
      conversions: 560,
      conversionRate: 14.0,
    },
    winner: "A",
  },
];

// Status Badge Component
function StatusBadge({ status }: { status: Campaign["status"] }) {
  const config = {
    active: {
      label: "Active",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: Play,
    },
    paused: {
      label: "En pause",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: Pause,
    },
    completed: {
      label: "Terminée",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      icon: CheckCircle2,
    },
    scheduled: {
      label: "Programmée",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Clock,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", className)}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

// Channel Badge Component
function ChannelBadge({ channel }: { channel: Campaign["channel"] }) {
  const config = {
    email: { label: "Email", icon: Mail, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    sms: { label: "SMS", icon: MessageSquare, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    push: { label: "Push", icon: Bell, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    multi: { label: "Multi", icon: Sparkles, className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  };

  const { label, icon: Icon, className } = config[channel];

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

// Campaign Card Component
function CampaignCard({ campaign }: { campaign: Campaign }) {
  const budgetPercentage = (campaign.spent / campaign.budget) * 100;
  const isBudgetHigh = budgetPercentage > 80;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-rose-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{campaign.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={campaign.status} />
              <ChannelBadge channel={campaign.channel} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Portée</p>
            <p className="text-lg font-bold text-rose-600">{campaign.reach.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Conversions</p>
            <p className="text-lg font-bold text-green-600">{campaign.performance.conversions.toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Budget</span>
            <span className="text-xs font-medium">
              {campaign.spent.toLocaleString()}€ / {campaign.budget.toLocaleString()}€
            </span>
          </div>
          <Progress value={budgetPercentage} className={cn("h-2", isBudgetHigh && "[&>div]:bg-red-500")} />
        </div>

        {campaign.status !== "scheduled" && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">CTR</p>
              <p className="font-semibold text-sm">{campaign.performance.ctr}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Taux conv.</p>
              <p className="font-semibold text-sm">{campaign.performance.conversionRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Clics</p>
              <p className="font-semibold text-sm">{campaign.performance.clicks.toLocaleString()}</p>
            </div>
          </div>
        )}

        {campaign.status === "scheduled" && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Début: <span className="font-medium text-foreground">{new Date(campaign.startDate).toLocaleDateString("fr-FR")}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketingPage() {
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "scheduled" | "paused" | "completed">("all");

  // Calculate stats
  const totalReach = mockCampaigns.reduce((sum, c) => sum + c.reach, 0);
  const activeCampaigns = mockCampaigns.filter((c) => c.status === "active").length;
  const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.performance.conversions, 0);
  const totalClicks = mockCampaigns.reduce((sum, c) => sum + c.performance.clicks, 0);
  const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const totalBudget = mockCampaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = mockCampaigns.reduce((sum, c) => sum + c.spent, 0);
  const roi = totalSpent > 0 ? ((totalConversions * 50 - totalSpent) / totalSpent) * 100 : 0; // Assuming avg order value of 50€

  // Filter campaigns
  const filteredCampaigns = selectedTab === "all"
    ? mockCampaigns
    : mockCampaigns.filter((c) => c.status === selectedTab);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Campagnes actives</p>
                  <p className="text-3xl font-bold text-rose-600">{activeCampaigns}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>+12% vs mois dernier</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Portée totale</p>
                  <p className="text-3xl font-bold text-blue-600">{(totalReach / 1000).toFixed(1)}K</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>+8.3% vs mois dernier</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Taux de conversion</p>
                  <p className="text-3xl font-bold text-green-600">{avgConversionRate.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>-2.1% vs mois dernier</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">ROI</p>
                  <p className="text-3xl font-bold text-amber-600">{roi.toFixed(0)}%</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>+15.2% vs mois dernier</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button className="h-auto py-4 bg-rose-600 hover:bg-rose-700 text-white">
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Créer une campagne</p>
                    <p className="text-xs opacity-90">Nouvelle campagne marketing</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/10">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-rose-600" />
                  <div className="text-left">
                    <p className="font-semibold">Envoyer newsletter</p>
                    <p className="text-xs text-muted-foreground">Newsletter hebdomadaire</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/10">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-rose-600" />
                  <div className="text-left">
                    <p className="font-semibold">Voir les rapports</p>
                    <p className="text-xs text-muted-foreground">Analyses détaillées</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Campagnes actives</CardTitle>
              <div className="flex items-center gap-2">
                {(["all", "active", "scheduled", "paused", "completed"] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant={selectedTab === tab ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTab(tab)}
                    className={cn(
                      selectedTab === tab && "bg-rose-600 hover:bg-rose-700 text-white"
                    )}
                  >
                    {tab === "all" ? "Toutes" :
                     tab === "active" ? "Actives" :
                     tab === "scheduled" ? "Programmées" :
                     tab === "paused" ? "En pause" : "Terminées"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
            {filteredCampaigns.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune campagne trouvée</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-rose-500" />
              Performance par canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {channelPerformance.map((channel) => (
                <div key={channel.channel}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                        <channel.icon className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{channel.channel}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.sent.toLocaleString()} envoyés
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{channel.openRate}%</p>
                        <p className="text-xs text-muted-foreground">Taux ouverture</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{channel.clickRate}%</p>
                        <p className="text-xs text-muted-foreground">Taux clic</p>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        channel.trend > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {channel.trend > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(channel.trend)}%
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Délivrés</p>
                      <Progress
                        value={(channel.delivered / channel.sent) * 100}
                        className="h-2"
                      />
                      <p className="text-xs font-medium mt-1">{channel.delivered.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ouverts</p>
                      <Progress
                        value={(channel.opened / channel.delivered) * 100}
                        className="h-2 [&>div]:bg-blue-500"
                      />
                      <p className="text-xs font-medium mt-1">{channel.opened.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cliqués</p>
                      <Progress
                        value={(channel.clicked / channel.opened) * 100}
                        className="h-2 [&>div]:bg-green-500"
                      />
                      <p className="text-xs font-medium mt-1">{channel.clicked.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Performance</p>
                      <Progress
                        value={channel.openRate}
                        className="h-2 [&>div]:bg-rose-500"
                      />
                      <p className="text-xs font-medium mt-1">{channel.openRate}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* A/B Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-rose-500" />
              Résultats des tests A/B
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {abTests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{test.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {test.status === "running" ? "En cours" : "Terminé"}
                      </p>
                    </div>
                    {test.winner && (
                      <Badge className="bg-rose-600 text-white">
                        Gagnant: Variante {test.winner}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Variant A */}
                    <div className={cn(
                      "border rounded-lg p-4 transition-all",
                      test.winner === "A" && "border-rose-500 bg-rose-50 dark:bg-rose-900/10"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">Variante A</span>
                        {test.winner === "A" && (
                          <CheckCircle2 className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{test.variantA.name}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Envoyés</span>
                          <span className="font-medium">{test.variantA.sent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Conversions</span>
                          <span className="font-medium">{test.variantA.conversions}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Taux conversion</span>
                            <span className="text-lg font-bold text-rose-600">
                              {test.variantA.conversionRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Variant B */}
                    <div className={cn(
                      "border rounded-lg p-4 transition-all",
                      test.winner === "B" && "border-rose-500 bg-rose-50 dark:bg-rose-900/10"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">Variante B</span>
                        {test.winner === "B" && (
                          <CheckCircle2 className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{test.variantB.name}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Envoyés</span>
                          <span className="font-medium">{test.variantB.sent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Conversions</span>
                          <span className="font-medium">{test.variantB.conversions}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Taux conversion</span>
                            <span className="text-lg font-bold text-rose-600">
                              {test.variantB.conversionRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {test.status === "completed" && test.winner && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-400">
                        <span className="font-semibold">Résultat:</span> La variante {test.winner} a un taux de conversion
                        {" "}{(test.winner === "A"
                          ? ((test.variantA.conversionRate - test.variantB.conversionRate) / test.variantB.conversionRate * 100).toFixed(1)
                          : ((test.variantB.conversionRate - test.variantA.conversionRate) / test.variantA.conversionRate * 100).toFixed(1)
                        )}% supérieur
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

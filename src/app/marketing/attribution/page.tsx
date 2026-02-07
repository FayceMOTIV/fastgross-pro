"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Funnel, FunnelChart,
  LabelList, Legend, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, DollarSign,
  Target, Clock, ArrowRight,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getConversionsBySource,
  getBestPerformingCampaigns,
  getConversionFunnel,
  getAverageTimeToConversion,
  getROIByChannel,
  type SourcePerformance,
  type CampaignPerformance,
  type ConversionFunnel,
} from "@/services/tracking-service";

// Chart colors
const COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#f59e0b", "#ef4444", "#06b6d4"];

// KPI Card component
function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={cn("text-xs", change >= 0 ? "text-green-600" : "text-red-600")}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && (
              <span className="text-xs text-muted-foreground">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttributionPage() {
  const [sources, setSources] = useState<SourcePerformance[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnel[]>([]);
  const [timeToConversion, setTimeToConversion] = useState<{ days: number; stages: { stage: string; avgDays: number }[] }>({ days: 0, stages: [] });
  const [roi, setRoi] = useState<{ channel: string; spend: number; revenue: number; roi: number }[]>([]);
  const [period, setPeriod] = useState("30d");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);
    const [sourcesData, campaignsData, funnelData, timeData, roiData] = await Promise.all([
      getConversionsBySource(),
      getBestPerformingCampaigns(),
      getConversionFunnel(),
      getAverageTimeToConversion(),
      getROIByChannel(),
    ]);
    setSources(sourcesData);
    setCampaigns(campaignsData);
    setFunnel(funnelData);
    setTimeToConversion(timeData);
    setRoi(roiData);
    setIsLoading(false);
  };

  // Calculate totals
  const totals = {
    visits: sources.reduce((sum, s) => sum + s.visits, 0),
    leads: sources.reduce((sum, s) => sum + s.leads, 0),
    conversions: sources.reduce((sum, s) => sum + s.conversions, 0),
    revenue: sources.reduce((sum, s) => sum + s.revenue, 0),
    avgCAC: sources.length > 0
      ? Math.round(sources.reduce((sum, s) => sum + s.cac, 0) / sources.filter(s => s.cac > 0).length)
      : 0,
  };

  // Prepare chart data
  const sourceChartData = sources.map((s) => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    conversions: s.conversions,
    revenue: s.revenue,
  }));

  const roiChartData = roi.map((r) => ({
    name: r.channel,
    ROI: r.roi,
    spend: r.spend,
    revenue: r.revenue,
  }));

  const funnelChartData = funnel.map((f, i) => ({
    name: f.stage,
    value: f.count,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Attribution Marketing</h1>
              <p className="text-muted-foreground">
                Analysez la performance de vos canaux d&apos;acquisition
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {["7d", "30d", "90d"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      period === p ? "bg-white shadow" : "hover:bg-white/50"
                    )}
                  >
                    {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "90 jours"}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard
              title="Visiteurs"
              value={totals.visits.toLocaleString()}
              change={12}
              changeLabel="vs période préc."
              icon={Users}
              color="bg-blue-600"
            />
            <KPICard
              title="Leads générés"
              value={totals.leads.toLocaleString()}
              change={8}
              changeLabel="vs période préc."
              icon={Target}
              color="bg-purple-600"
            />
            <KPICard
              title="Conversions"
              value={totals.conversions}
              change={15}
              changeLabel="vs période préc."
              icon={TrendingUp}
              color="bg-green-600"
            />
            <KPICard
              title="Revenu généré"
              value={`${(totals.revenue / 1000).toFixed(1)}k€`}
              change={22}
              changeLabel="vs période préc."
              icon={DollarSign}
              color="bg-amber-600"
            />
            <KPICard
              title="CAC moyen"
              value={`${totals.avgCAC}€`}
              change={-5}
              changeLabel="vs période préc."
              icon={Clock}
              color="bg-cyan-600"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Entonnoir de conversion</CardTitle>
              <CardDescription>
                Parcours des visiteurs jusqu&apos;à la conversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), "Nombre"]}
                    />
                    <Funnel
                      data={funnelChartData}
                      dataKey="value"
                      nameKey="name"
                      isAnimationActive
                    >
                      <LabelList
                        position="right"
                        fill="#000"
                        stroke="none"
                        dataKey="name"
                        formatter={(value: string) => value}
                      />
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel stats */}
              <div className="mt-4 space-y-2">
                {funnel.slice(0, -1).map((stage, i) => (
                  <div key={stage.stage} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {stage.stage} → {funnel[i + 1]?.stage}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">
                        {funnel[i + 1]?.conversionRate.toFixed(1)}%
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-red-500 text-xs">
                        -{stage.dropoffRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ROI by Channel */}
          <Card>
            <CardHeader>
              <CardTitle>ROI par canal</CardTitle>
              <CardDescription>
                Retour sur investissement de chaque canal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roiChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "ROI" ? `${value}%` : `${value}€`,
                        name
                      ]}
                    />
                    <Bar dataKey="ROI" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Conversions by Source */}
          <Card>
            <CardHeader>
              <CardTitle>Conversions par source</CardTitle>
              <CardDescription>
                Performance de chaque source de trafic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenu (€)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Time to Conversion */}
          <Card>
            <CardHeader>
              <CardTitle>Temps de conversion</CardTitle>
              <CardDescription>
                Durée moyenne : {timeToConversion.days} jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeToConversion.stages.map((stage, i) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-muted-foreground">{stage.avgDays} jours</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(stage.avgDays / timeToConversion.days) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">{timeToConversion.days} jours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sources Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Détail par source</CardTitle>
            <CardDescription>
              Performance détaillée de chaque canal d&apos;acquisition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source / Medium</TableHead>
                  <TableHead className="text-right">Visites</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Revenu</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={`${source.source}-${source.medium}`}>
                    <TableCell>
                      <div>
                        <span className="font-medium capitalize">{source.source}</span>
                        <span className="text-muted-foreground"> / {source.medium}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{source.visits.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{source.leads.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{source.conversions}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {source.revenue.toLocaleString()}€
                    </TableCell>
                    <TableCell className="text-right">
                      {source.cac > 0 ? `${source.cac.toFixed(0)}€` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {source.roas < Infinity ? (
                        <span className={cn(source.roas >= 3 ? "text-green-600" : source.roas >= 1 ? "text-amber-600" : "text-red-600")}>
                          {source.roas.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="text-green-600">∞</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Best Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Meilleures campagnes email</CardTitle>
            <CardDescription>
              Performance des campagnes marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Envoyés</TableHead>
                  <TableHead className="text-right">Ouverture</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Revenu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.campaignId}>
                    <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                    <TableCell className="text-right">{campaign.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(campaign.openRate >= 30 ? "text-green-600" : "text-muted-foreground")}>
                        {campaign.openRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(campaign.clickRate >= 5 ? "text-green-600" : "text-muted-foreground")}>
                        {campaign.clickRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{campaign.converted}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {campaign.revenue.toLocaleString()}€
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

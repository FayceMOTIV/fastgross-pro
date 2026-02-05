"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Package,
  Users,
  Save,
  Info,
  Percent,
  Euro,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  getAllProducts,
  getAllClients,
  getAllCategoryRules,
  getPriceGrids,
  simulateDiscount,
  calculateMarginPercent,
  calculateMaxDiscount,
  analyzeAllMargins,
} from "@/services/pricing-service";
import { analyzePromoOpportunities } from "@/services/smart-pricing-ai-service";
import {
  CategoryMarginRules,
  ProductPricing,
  ClientPricing,
  MarginAlert,
  PriceGrid,
} from "@/types/pricing";

export default function PricingSettingsPage() {
  const [activeTab, setActiveTab] = useState("categories");
  const [isLoading, setIsLoading] = useState(true);

  // Données
  const [categoryRules, setCategoryRules] = useState<CategoryMarginRules[]>([]);
  const [products, setProducts] = useState<ProductPricing[]>([]);
  const [clients, setClients] = useState<ClientPricing[]>([]);
  const [priceGrids, setPriceGrids] = useState<PriceGrid[]>([]);
  const [marginAlerts, setMarginAlerts] = useState<MarginAlert[]>([]);

  // Simulateur
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [testDiscount, setTestDiscount] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<{
    originalPrice: number;
    originalMargin: number;
    newPrice: number;
    newMargin: number;
    isAllowed: boolean;
    maxDiscount: number;
    warnings: string[];
  } | null>(null);

  // Opportunités promo
  const [promoOpportunities, setPromoOpportunities] = useState<{
    totalProducts: number;
    productsWithRoom: number;
    overstockProducts: number;
    perishableProducts: number;
    topOpportunities: { productId: string; productName: string; maxDiscount: number; reason: string }[];
  } | null>(null);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, clientsData, rulesData, gridsData] = await Promise.all([
          getAllProducts(),
          getAllClients(),
          getAllCategoryRules(),
          getPriceGrids(),
        ]);

        setProducts(productsData);
        setClients(clientsData);
        setCategoryRules(rulesData);
        setPriceGrids(gridsData);

        // Analyser les marges
        const alerts = analyzeAllMargins(productsData, rulesData);
        setMarginAlerts(alerts);

        // Analyser les opportunités
        const opportunities = await analyzePromoOpportunities();
        setPromoOpportunities(opportunities);

        // Sélectionner le premier produit et client par défaut
        if (productsData.length > 0) setSelectedProductId(productsData[0].productId);
        if (clientsData.length > 0) setSelectedClientId(clientsData[0].clientId);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Simulation de remise
  useEffect(() => {
    if (!selectedProductId || testDiscount < 0) {
      setSimulationResult(null);
      return;
    }

    const product = products.find((p) => p.productId === selectedProductId);
    const client = clients.find((c) => c.clientId === selectedClientId);
    const categoryRule = categoryRules.find((r) => r.categoryId === product?.categoryId);

    if (!product || !categoryRule) return;

    // Calculer le prix client
    let clientPrice = product.baseSellingPrice;
    if (client) {
      const discount = client.globalDiscountPercent;
      clientPrice = product.baseSellingPrice * (1 - discount / 100);
    }

    const simulation = simulateDiscount(
      product,
      testDiscount,
      categoryRule,
      clientPrice
    );

    const maxDiscount = calculateMaxDiscount(
      product.purchasePriceWithFees,
      clientPrice,
      categoryRule.minMarginPercent
    );

    setSimulationResult({
      originalPrice: clientPrice,
      originalMargin: calculateMarginPercent(product.purchasePriceWithFees, clientPrice),
      newPrice: simulation.newPrice,
      newMargin: simulation.newMarginPercent,
      isAllowed: simulation.isAllowed,
      maxDiscount: maxDiscount.percent,
      warnings: simulation.warnings,
    });
  }, [selectedProductId, selectedClientId, testDiscount, products, clients, categoryRules]);

  // Stats résumées
  const stats = useMemo(() => {
    const criticalAlerts = marginAlerts.filter((a) => a.severity === "critical").length;
    const warningAlerts = marginAlerts.filter((a) => a.severity === "warning").length;
    const avgMargin =
      products.length > 0
        ? products.reduce((sum, p) => sum + p.currentMarginPercent, 0) / products.length
        : 0;

    return {
      totalProducts: products.length,
      avgMargin: avgMargin.toFixed(1),
      criticalAlerts,
      warningAlerts,
      productsWithRoom: promoOpportunities?.productsWithRoom || 0,
    };
  }, [products, marginAlerts, promoOpportunities]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Configuration des Marges & Pricing
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les règles de marge par catégorie et simulez vos remises
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Produits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgMargin}%</p>
                <p className="text-xs text-muted-foreground">Marge moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(stats.criticalAlerts > 0 && "border-red-200")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stats.criticalAlerts > 0 ? "bg-red-100" : "bg-gray-100")}>
                <AlertTriangle className={cn("h-5 w-5", stats.criticalAlerts > 0 ? "text-red-600" : "text-gray-600")} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticalAlerts}</p>
                <p className="text-xs text-muted-foreground">Alertes critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.productsWithRoom}</p>
                <p className="text-xs text-muted-foreground">Promo possibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes critiques */}
      {marginAlerts.filter((a) => a.severity === "critical").length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Alertes Marge Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {marginAlerts
                .filter((a) => a.severity === "critical")
                .slice(0, 5)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge variant="danger">{alert.currentMargin.toFixed(1)}%</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">
            <BarChart3 className="h-4 w-4 mr-2" />
            Règles par catégorie
          </TabsTrigger>
          <TabsTrigger value="simulator">
            <Calculator className="h-4 w-4 mr-2" />
            Simulateur
          </TabsTrigger>
          <TabsTrigger value="grids">
            <Users className="h-4 w-4 mr-2" />
            Grilles tarifaires
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            <TrendingUp className="h-4 w-4 mr-2" />
            Opportunités
          </TabsTrigger>
        </TabsList>

        {/* Tab: Règles par catégorie */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Règles de marge par catégorie</CardTitle>
              <CardDescription>
                Définissez les marges minimum, cible et maximum pour chaque catégorie de produits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Catégorie</th>
                      <th className="text-center p-3 font-medium">
                        <span className="text-red-600">Min %</span>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <span className="text-blue-600">Cible %</span>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <span className="text-green-600">Max %</span>
                      </th>
                      <th className="text-center p-3 font-medium">Perte OK?</th>
                      <th className="text-center p-3 font-medium">Perte max</th>
                      <th className="text-center p-3 font-medium">Alerte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRules.map((rule) => (
                      <tr key={rule.categoryId} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{rule.categoryName}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={rule.minMarginPercent}
                            className="w-20 text-center"
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={rule.targetMarginPercent}
                            className="w-20 text-center"
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={rule.maxMarginPercent}
                            className="w-20 text-center"
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox
                            checked={rule.allowNegativeMarginForOverstock}
                            className="data-[state=checked]:bg-amber-500"
                          />
                        </td>
                        <td className="p-3">
                          {rule.allowNegativeMarginForOverstock ? (
                            <Input
                              type="number"
                              value={Math.abs(rule.maxNegativeMarginPercent || 0)}
                              className="w-20 text-center"
                              min={0}
                              max={50}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={rule.alertBelowMargin || ""}
                            className="w-20 text-center"
                            min={0}
                            max={100}
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  Légende
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    <span className="text-red-600 font-medium">Min %</span>: Marge minimum
                    en dessous de laquelle l&apos;IA ne proposera jamais de remise
                  </li>
                  <li>
                    <span className="text-blue-600 font-medium">Cible %</span>: Marge idéale
                    à viser pour une rentabilité optimale
                  </li>
                  <li>
                    <span className="text-green-600 font-medium">Max %</span>: Marge maximum
                    pour éviter des prix perçus comme abusifs
                  </li>
                  <li>
                    <span className="font-medium">Perte OK?</span>: Autorise les ventes à
                    perte pour le déstockage (surstock, périssables)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Simulateur */}
        <TabsContent value="simulator" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Formulaire de simulation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Simulateur de Remise
                </CardTitle>
                <CardDescription>
                  Testez une remise avant de l&apos;appliquer pour vérifier l&apos;impact sur
                  la marge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.productId} value={p.productId}>
                          {p.productName} ({p.baseSellingPrice.toFixed(2)}€)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Client (optionnel)</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Prix catalogue</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.clientId} value={c.clientId}>
                          {c.clientName} ({c.priceGridName} -{c.globalDiscountPercent}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Remise à tester (%)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={testDiscount}
                      onChange={(e) => setTestDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-24"
                    />
                    <input
                      type="range"
                      value={testDiscount}
                      onChange={(e) => setTestDiscount(parseFloat(e.target.value))}
                      min={0}
                      max={simulationResult?.maxDiscount || 30}
                      step={0.5}
                      className="flex-1"
                    />
                  </div>
                </div>

                {simulationResult && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Remise max possible:{" "}
                      <span className="font-bold text-primary">
                        {simulationResult.maxDiscount.toFixed(1)}%
                      </span>
                    </p>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((val) => (
                        <Button
                          key={val}
                          variant="outline"
                          size="sm"
                          onClick={() => setTestDiscount(val)}
                          disabled={val > simulationResult.maxDiscount}
                          className={cn(val > simulationResult.maxDiscount && "opacity-50")}
                        >
                          {val}%
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Résultat de simulation */}
            <Card
              className={cn(
                simulationResult &&
                  (simulationResult.isAllowed
                    ? "border-green-200"
                    : "border-red-200")
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {simulationResult?.isAllowed ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700">Remise Autorisée</span>
                    </>
                  ) : simulationResult ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-red-700">Remise Non Autorisée</span>
                    </>
                  ) : (
                    "Résultat de la simulation"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {simulationResult ? (
                  <div className="space-y-4">
                    {/* Prix */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Prix actuel</p>
                        <p className="text-xl font-bold">
                          {simulationResult.originalPrice.toFixed(2)}€
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Prix après remise</p>
                        <p className="text-xl font-bold">
                          {simulationResult.newPrice.toFixed(2)}€
                        </p>
                      </div>
                    </div>

                    {/* Marges */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Marge actuelle</p>
                        <p className="text-xl font-bold text-green-600">
                          {simulationResult.originalMargin.toFixed(1)}%
                        </p>
                      </div>
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          simulationResult.isAllowed ? "bg-green-50" : "bg-red-50"
                        )}
                      >
                        <p className="text-xs text-muted-foreground">Marge après</p>
                        <p
                          className={cn(
                            "text-xl font-bold",
                            simulationResult.isAllowed ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {simulationResult.newMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Visualisation de la marge */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>Marge minimum</span>
                        <span>30%</span>
                      </div>
                      <div className="relative h-4 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-full">
                        {/* Indicateur marge actuelle */}
                        <div
                          className="absolute top-0 w-1 h-4 bg-blue-600 rounded"
                          style={{
                            left: `${Math.min(simulationResult.originalMargin, 30) / 30 * 100}%`,
                          }}
                        />
                        {/* Indicateur nouvelle marge */}
                        <div
                          className={cn(
                            "absolute top-0 w-1 h-4 rounded",
                            simulationResult.isAllowed ? "bg-green-600" : "bg-red-600"
                          )}
                          style={{
                            left: `${Math.max(0, Math.min(simulationResult.newMargin, 30)) / 30 * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-600 rounded" /> Actuelle
                        </span>
                        <span className="flex items-center gap-1">
                          <div className={cn("w-2 h-2 rounded", simulationResult.isAllowed ? "bg-green-600" : "bg-red-600")} />
                          Après remise
                        </span>
                      </div>
                    </div>

                    {/* Warnings */}
                    {simulationResult.warnings.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-medium text-amber-800 mb-1">Avertissements</p>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {simulationResult.warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Message final */}
                    <div
                      className={cn(
                        "p-4 rounded-lg text-center",
                        simulationResult.isAllowed ? "bg-green-50" : "bg-red-50"
                      )}
                    >
                      {simulationResult.isAllowed ? (
                        <p className="text-green-700">
                          Cette remise de <strong>{testDiscount}%</strong> est autorisée.
                          La marge reste à <strong>{simulationResult.newMargin.toFixed(1)}%</strong>.
                        </p>
                      ) : (
                        <p className="text-red-700">
                          Cette remise de <strong>{testDiscount}%</strong> n&apos;est pas
                          autorisée. Remise max:{" "}
                          <strong>{simulationResult.maxDiscount.toFixed(1)}%</strong>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez un produit et entrez une remise à tester</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Grilles tarifaires */}
        <TabsContent value="grids" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {priceGrids.map((grid) => (
              <Card key={grid.id} className={cn(grid.isDefault && "border-primary")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {grid.name}
                    {grid.isDefault && <Badge>Par défaut</Badge>}
                  </CardTitle>
                  <CardDescription>{grid.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold text-primary">
                        -{grid.baseDiscountPercent}%
                      </p>
                      <p className="text-sm text-muted-foreground">Remise globale</p>
                    </div>

                    {grid.minMonthlyVolume && (
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span>Min {grid.minMonthlyVolume}€/mois</span>
                      </div>
                    )}

                    {grid.minClientAge && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Ancienneté {grid.minClientAge} mois</span>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Avantages</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {grid.benefits.map((b, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Opportunités */}
        <TabsContent value="opportunities" className="mt-6">
          {promoOpportunities && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {promoOpportunities.productsWithRoom}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Produits avec marge de manoeuvre
                    </p>
                  </CardContent>
                </Card>
                <Card className={cn(promoOpportunities.overstockProducts > 0 && "border-amber-200")}>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {promoOpportunities.overstockProducts}
                    </p>
                    <p className="text-sm text-muted-foreground">Produits en surstock</p>
                  </CardContent>
                </Card>
                <Card className={cn(promoOpportunities.perishableProducts > 0 && "border-red-200")}>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {promoOpportunities.perishableProducts}
                    </p>
                    <p className="text-sm text-muted-foreground">Dates courtes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {promoOpportunities.totalProducts}
                    </p>
                    <p className="text-sm text-muted-foreground">Total produits</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top opportunités */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Opportunités de Promotion</CardTitle>
                  <CardDescription>
                    Produits avec le plus de potentiel pour des offres promotionnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {promoOpportunities.topOpportunities.map((opp, i) => (
                      <div
                        key={opp.productId}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium">{opp.productName}</p>
                            <p className="text-sm text-muted-foreground">{opp.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              opp.maxDiscount > 15
                                ? "success"
                                : opp.maxDiscount > 8
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            Jusqu&apos;à -{opp.maxDiscount.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

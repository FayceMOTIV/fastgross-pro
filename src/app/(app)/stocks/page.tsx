'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  Sparkles,
  Loader2,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CATALOGUE_DISTRAM } from '@/data/catalogue-distram';

interface StockPrediction {
  produit: string;
  stockActuel: number;
  consommationJour: number;
  joursRestants: number;
  dateRupture: string;
  quantiteRecommandee: number;
  urgence: 'critique' | 'attention' | 'ok';
}

export default function StocksPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<StockPrediction[] | null>(null);

  // Demo stock data
  const stockData: StockPrediction[] = [
    { produit: 'Broche de kebab 10kg', stockActuel: 45, consommationJour: 8, joursRestants: 5, dateRupture: '05/02/2026', quantiteRecommandee: 80, urgence: 'critique' },
    { produit: 'Pain pita (lot 100)', stockActuel: 120, consommationJour: 25, joursRestants: 4, dateRupture: '04/02/2026', quantiteRecommandee: 200, urgence: 'critique' },
    { produit: 'Sauce blanche 5L', stockActuel: 35, consommationJour: 5, joursRestants: 7, dateRupture: '07/02/2026', quantiteRecommandee: 50, urgence: 'attention' },
    { produit: 'Frites surgelées 10kg', stockActuel: 200, consommationJour: 15, joursRestants: 13, dateRupture: '13/02/2026', quantiteRecommandee: 150, urgence: 'ok' },
    { produit: 'Fromage râpé 2kg', stockActuel: 25, consommationJour: 4, joursRestants: 6, dateRupture: '06/02/2026', quantiteRecommandee: 40, urgence: 'attention' },
    { produit: 'Coca-Cola 33cl (pack 24)', stockActuel: 150, consommationJour: 10, joursRestants: 15, dateRupture: '15/02/2026', quantiteRecommandee: 100, urgence: 'ok' },
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPredictions(stockData);
    setIsAnalyzing(false);
  };

  const getUrgenceColor = (urgence: string) => {
    switch (urgence) {
      case 'critique': return 'bg-red-100 text-red-800 border-red-300';
      case 'attention': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getUrgenceLabel = (urgence: string) => {
    switch (urgence) {
      case 'critique': return 'Critique';
      case 'attention': return 'Attention';
      default: return 'OK';
    }
  };

  const stats = {
    totalProduits: CATALOGUE_DISTRAM.length,
    ruptureBientot: stockData.filter(s => s.urgence === 'critique').length,
    aCommander: stockData.filter(s => s.urgence !== 'ok').length,
    valeurStock: 45000,
  };

  return (
    <div className="min-h-screen">
      <Header
        title="IA Stocks"
        subtitle="Prédiction des besoins et optimisation des stocks"
      />

      <div className="p-6">
        {/* Hero */}
        <Card className="mb-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Prédiction intelligente des stocks</h2>
                <p className="text-purple-100">
                  Anticipez les ruptures, optimisez vos commandes, réduisez le gaspillage
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">-25% de ruptures</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.totalProduits}</p>
              <p className="text-sm text-gray-500">Produits suivis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.ruptureBientot}</p>
              <p className="text-sm text-gray-500">Ruptures proches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.aCommander}</p>
              <p className="text-sm text-gray-500">À commander</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.valeurStock)}</p>
              <p className="text-sm text-gray-500">Valeur stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Action button */}
        <div className="mb-6">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyser les stocks
              </>
            )}
          </Button>
        </div>

        {/* Critical alerts */}
        {predictions && predictions.filter(p => p.urgence === 'critique').length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Alertes de rupture imminente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictions.filter(p => p.urgence === 'critique').map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="font-bold text-red-600">{item.joursRestants}j</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.produit}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>Stock: {item.stockActuel} unités</span>
                          <span>•</span>
                          <span className="text-red-600">Rupture le {item.dateRupture}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Recommandé: <strong>{item.quantiteRecommandee}</strong>
                      </span>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1">
                        <ShoppingCart className="w-4 h-4" />
                        Commander
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Prévisions de stock
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {!predictions && !isAnalyzing && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Cliquez sur "Analyser les stocks" pour obtenir les prédictions</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Analyse des stocks en cours...</p>
              </div>
            )}

            {predictions && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock actuel</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conso/jour</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jours restants</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date rupture</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgence</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommandation</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predictions.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.produit}</td>
                        <td className="px-4 py-3 text-gray-600">{item.stockActuel}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            {item.consommationJour}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${item.joursRestants <= 5 ? 'text-red-600' : item.joursRestants <= 10 ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.joursRestants} jours
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.dateRupture}</td>
                        <td className="px-4 py-3">
                          <Badge className={getUrgenceColor(item.urgence)}>
                            {getUrgenceLabel(item.urgence)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-purple-600">
                          {item.quantiteRecommandee} unités
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={item.urgence === 'critique' ? 'default' : 'outline'}
                            size="sm"
                            className={item.urgence === 'critique' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                          >
                            Commander
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Insights IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Tendance saisonnière', insight: 'Augmentation de 15% de la demande en viandes prévue pour février', icon: TrendingUp },
                { title: 'Optimisation', insight: 'Grouper les commandes le mardi permet 8% d\'économie sur les frais de port', icon: ShoppingCart },
                { title: 'Prédiction', insight: 'Stock de sauces insuffisant pour le pic du week-end prochain', icon: AlertTriangle },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">{item.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{item.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

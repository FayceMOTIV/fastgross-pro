'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  ShoppingCart,
  Sparkles,
  Image as ImageIcon,
  Zap,
  Package,
  ChefHat,
  Store
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProduitRecommande {
  ref: string;
  nom: string;
  categorie: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  totalHT: number;
  raison: string;
  obligatoire: boolean;
}

interface PlatDetecte {
  nom: string;
  description?: string;
  categorie: string;
  ingredients: string[];
  prix?: number;
  ventesEstimees: number;
  confiance: number;
}

interface ScanResult {
  success: boolean;
  tempsAnalyse: number;
  restaurant: {
    type: string;
    specialite?: string;
  };
  platsDetectes: PlatDetecte[];
  produitsRecommandes: ProduitRecommande[];
  emballagesRecommandes: ProduitRecommande[];
  totalProduitsHT: number;
  totalEmballagesHT: number;
  totalHT: number;
  totalTTC: number;
  margeEstimee: number;
  notes: string[];
  erreur?: string;
}

const SCAN_API_URL = 'https://us-central1-facemediagrossiste.cloudfunctions.net/scanMenu';

export default function ScanMenuPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'produits' | 'emballages'>('produits');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(SCAN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: selectedImage }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse');
      }

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.erreur || 'Erreur lors de l\'analyse du menu');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur de connexion au serveur');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateQuote = () => {
    if (!result) return;

    // Stocker les données du scan dans localStorage pour la page devis
    const devisData = {
      source: 'scan_menu',
      restaurant: result.restaurant,
      platsDetectes: result.platsDetectes,
      produitsRecommandes: result.produitsRecommandes,
      emballagesRecommandes: result.emballagesRecommandes,
      totaux: {
        totalProduitsHT: result.totalProduitsHT,
        totalEmballagesHT: result.totalEmballagesHT,
        totalHT: result.totalHT,
        totalTTC: result.totalTTC,
      }
    };
    localStorage.setItem('scanMenuDevisData', JSON.stringify(devisData));
    router.push('/devis/nouveau');
  };

  const handleCreateOrder = () => {
    console.log('Creating order with:', result);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'burger': return '🍔';
      case 'kebab': return '🥙';
      case 'tacos': return '🌮';
      case 'pizza': return '🍕';
      default: return '🍽️';
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="IA Scan Menu"
        subtitle="Photographiez un menu, obtenez un devis en 30 secondes"
      />

      <div className="p-6">
        {/* Hero card */}
        <Card className="mb-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Comment ca marche ?</h2>
                <p className="text-orange-100">
                  1. Photographiez un menu → 2. L'IA GPT-4o identifie les plats et ingredients → 3. Generez un devis personnalise
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Propulse par GPT-4o Vision</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-600" />
                Telecharger un menu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {!selectedImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all"
                >
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-orange-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Cliquez pour telecharger
                  </p>
                  <p className="text-sm text-gray-500">
                    ou glissez-deposez une image de menu
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG jusqu'a 10MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={selectedImage}
                      alt="Menu uploade"
                      className="w-full h-64 object-contain"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setResult(null);
                        setError(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyse GPT-4o en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Analyser avec GPT-4o Vision
                      </>
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Resultats de l'analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result && !isAnalyzing && (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Telechargez un menu pour commencer l'analyse</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                  </div>
                  <p className="text-gray-900 font-medium">Analyse GPT-4o Vision en cours...</p>
                  <p className="text-sm text-gray-500 mt-1">Identification precise des plats et calcul des quantites</p>
                </div>
              )}

              {result && result.success && (
                <div className="space-y-6">
                  {/* Restaurant type */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getTypeIcon(result.restaurant.type)}</span>
                      <div>
                        <p className="font-medium text-blue-900 capitalize">
                          Restaurant {result.restaurant.type}
                        </p>
                        {result.restaurant.specialite && (
                          <p className="text-sm text-blue-700">{result.restaurant.specialite}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Analyse terminee en {result.tempsAnalyse.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      {result.platsDetectes.length} plats detectes, {result.produitsRecommandes.length} produits + {result.emballagesRecommandes.length} emballages recommandes
                    </p>
                  </div>

                  {/* Notes */}
                  {result.notes && result.notes.length > 0 && (
                    <div className="bg-yellow-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Notes de l'analyse :</p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {result.notes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Detected dishes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ChefHat className="w-4 h-4" />
                      Plats detectes
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.platsDetectes.map((plat, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{plat.nom}</p>
                            <p className="text-sm text-gray-500">
                              {plat.categorie} • ~{plat.ventesEstimees} ventes/sem • {Math.round(plat.confiance * 100)}% confiance
                            </p>
                            {plat.ingredients && plat.ingredients.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {plat.ingredients.slice(0, 5).join(', ')}
                                {plat.ingredients.length > 5 && '...'}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize ml-2">{plat.categorie}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-center mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(result.totalProduitsHT)}</p>
                        <p className="text-sm text-gray-500">Produits HT</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(result.totalEmballagesHT)}</p>
                        <p className="text-sm text-gray-500">Emballages HT</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalHT)}</p>
                        <p className="text-sm text-gray-500">Total HT</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalTTC)}</p>
                        <p className="text-sm text-gray-500">Total TTC</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{result.margeEstimee}%</p>
                        <p className="text-sm text-gray-500">Marge estimee</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateQuote}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Creer un devis
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Commander
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Products & Emballages tables */}
        {result && result.success && (
          <>
            {/* Tab buttons */}
            <div className="flex gap-2 mt-6 mb-4">
              <Button
                variant={activeTab === 'produits' ? 'default' : 'outline'}
                onClick={() => setActiveTab('produits')}
                className={activeTab === 'produits' ? 'bg-orange-600' : ''}
              >
                <Store className="w-4 h-4 mr-2" />
                Produits ({result.produitsRecommandes.length})
              </Button>
              <Button
                variant={activeTab === 'emballages' ? 'default' : 'outline'}
                onClick={() => setActiveTab('emballages')}
                className={activeTab === 'emballages' ? 'bg-orange-600' : ''}
              >
                <Package className="w-4 h-4 mr-2" />
                Emballages ({result.emballagesRecommandes.length})
              </Button>
            </div>

            {/* Products table */}
            {activeTab === 'produits' && result.produitsRecommandes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Detail des produits recommandes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qte</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unite</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P.U. HT</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.produitsRecommandes.map((product, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${!product.obligatoire ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3 text-sm font-mono text-gray-500">{product.ref}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {product.nom}
                              {!product.obligatoire && (
                                <Badge variant="outline" className="ml-2 text-xs">Optionnel</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{product.raison}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{product.quantite}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{product.unite}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(product.prixUnitaire)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(product.totalHT)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total Produits HT</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(result.totalProduitsHT)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emballages table */}
            {activeTab === 'emballages' && result.emballagesRecommandes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Detail des emballages recommandes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emballage</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qte</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unite</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P.U. HT</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.emballagesRecommandes.map((emballage, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${!emballage.obligatoire ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3 text-sm font-mono text-gray-500">{emballage.ref}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {emballage.nom}
                              {!emballage.obligatoire && (
                                <Badge variant="outline" className="ml-2 text-xs">Optionnel</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{emballage.raison}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{emballage.quantite}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{emballage.unite}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(emballage.prixUnitaire)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(emballage.totalHT)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total Emballages HT</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(result.totalEmballagesHT)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

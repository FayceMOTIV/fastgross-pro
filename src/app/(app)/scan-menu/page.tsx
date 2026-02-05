'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Zap,
  Package,
  ChefHat,
  Store,
  Send,
  Building2,
  MapPin,
  Phone,
  Trash2,
  Plus,
  Minus,
  History,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { analyzeMenuImage } from '@/services/ai/openai-vision';
import { saveScanToHistory } from '@/services/scan-history-service';
import { useAuth } from '@/hooks/useAuth';

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
  selected?: boolean;
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

interface ClientInfo {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
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

// DISTRAM Product Catalog Mapping
const DISTRAM_CATALOG: Record<string, { ref: string; nom: string; prix: number; unite: string; categorie: string }> = {
  // Viandes
  'viande_kebab': { ref: 'DIS-001', nom: 'Viande Kebab Premium 5kg', prix: 45.90, unite: 'carton', categorie: 'viandes' },
  'viande_shawarma': { ref: 'DIS-002', nom: 'Viande Shawarma 5kg', prix: 48.50, unite: 'carton', categorie: 'viandes' },
  'merguez': { ref: 'DIS-003', nom: 'Merguez Halal x50', prix: 32.90, unite: 'carton', categorie: 'viandes' },
  'poulet_grille': { ref: 'DIS-004', nom: 'Filets de Poulet Marinés 5kg', prix: 38.90, unite: 'carton', categorie: 'viandes' },
  'boeuf_hache': { ref: 'DIS-005', nom: 'Boeuf Haché Halal 5kg', prix: 52.00, unite: 'carton', categorie: 'viandes' },
  'escalope_poulet': { ref: 'DIS-006', nom: 'Escalopes de Poulet 5kg', prix: 35.90, unite: 'carton', categorie: 'viandes' },
  'steaks_burger': { ref: 'DIS-007', nom: 'Steaks Burger Halal x40', prix: 42.90, unite: 'carton', categorie: 'viandes' },
  'nuggets': { ref: 'DIS-008', nom: 'Nuggets de Poulet 2.5kg', prix: 24.90, unite: 'sachet', categorie: 'viandes' },

  // Pains et Wraps
  'pain_pita': { ref: 'DIS-020', nom: 'Pain Pita x50', prix: 12.90, unite: 'carton', categorie: 'pains' },
  'pain_burger': { ref: 'DIS-021', nom: 'Pain Burger x48', prix: 14.90, unite: 'carton', categorie: 'pains' },
  'tortilla': { ref: 'DIS-022', nom: 'Tortilla Tacos x100', prix: 18.90, unite: 'carton', categorie: 'pains' },
  'galette_wrap': { ref: 'DIS-023', nom: 'Galette Wrap x50', prix: 15.90, unite: 'carton', categorie: 'pains' },
  'pain_sandwich': { ref: 'DIS-024', nom: 'Pain Sandwich x40', prix: 11.90, unite: 'carton', categorie: 'pains' },
  'naan': { ref: 'DIS-025', nom: 'Pain Naan x30', prix: 13.90, unite: 'carton', categorie: 'pains' },

  // Sauces
  'sauce_blanche': { ref: 'DIS-040', nom: 'Sauce Blanche 5L', prix: 22.90, unite: 'bidon', categorie: 'sauces' },
  'sauce_samourai': { ref: 'DIS-041', nom: 'Sauce Samourai 5L', prix: 24.90, unite: 'bidon', categorie: 'sauces' },
  'sauce_algerienne': { ref: 'DIS-042', nom: 'Sauce Algérienne 5L', prix: 23.90, unite: 'bidon', categorie: 'sauces' },
  'sauce_harissa': { ref: 'DIS-043', nom: 'Sauce Harissa 5L', prix: 21.90, unite: 'bidon', categorie: 'sauces' },
  'ketchup': { ref: 'DIS-044', nom: 'Ketchup 5L', prix: 15.90, unite: 'bidon', categorie: 'sauces' },
  'mayonnaise': { ref: 'DIS-045', nom: 'Mayonnaise 5L', prix: 17.90, unite: 'bidon', categorie: 'sauces' },
  'sauce_burger': { ref: 'DIS-046', nom: 'Sauce Burger 5L', prix: 19.90, unite: 'bidon', categorie: 'sauces' },
  'moutarde': { ref: 'DIS-047', nom: 'Moutarde 5kg', prix: 14.90, unite: 'seau', categorie: 'sauces' },

  // Fromages
  'cheddar': { ref: 'DIS-060', nom: 'Cheddar Tranché 1kg', prix: 12.90, unite: 'paquet', categorie: 'fromages' },
  'emmental_rape': { ref: 'DIS-061', nom: 'Emmental Râpé 2.5kg', prix: 22.90, unite: 'sachet', categorie: 'fromages' },
  'feta': { ref: 'DIS-062', nom: 'Feta en Dés 2kg', prix: 18.90, unite: 'barquette', categorie: 'fromages' },
  'mozzarella': { ref: 'DIS-063', nom: 'Mozzarella Râpée 2.5kg', prix: 24.90, unite: 'sachet', categorie: 'fromages' },

  // Légumes
  'salade_melangee': { ref: 'DIS-080', nom: 'Salade Mélangée 1kg', prix: 4.90, unite: 'sachet', categorie: 'legumes' },
  'tomates': { ref: 'DIS-081', nom: 'Tomates Fraîches 5kg', prix: 12.90, unite: 'caisse', categorie: 'legumes' },
  'oignons': { ref: 'DIS-082', nom: 'Oignons Émincés 2.5kg', prix: 8.90, unite: 'sachet', categorie: 'legumes' },
  'cornichons': { ref: 'DIS-083', nom: 'Cornichons Tranchés 5kg', prix: 18.90, unite: 'seau', categorie: 'legumes' },
  'chou_blanc': { ref: 'DIS-084', nom: 'Chou Blanc Râpé 2kg', prix: 6.90, unite: 'sachet', categorie: 'legumes' },

  // Frites et Accompagnements
  'frites_surgelees': { ref: 'DIS-100', nom: 'Frites Surgelées 10kg', prix: 18.90, unite: 'carton', categorie: 'frites' },
  'potatoes': { ref: 'DIS-101', nom: 'Potatoes 5kg', prix: 14.90, unite: 'sachet', categorie: 'frites' },
  'onion_rings': { ref: 'DIS-102', nom: 'Onion Rings 2.5kg', prix: 19.90, unite: 'sachet', categorie: 'frites' },
  'riz_basmati': { ref: 'DIS-103', nom: 'Riz Basmati 10kg', prix: 24.90, unite: 'sac', categorie: 'accompagnements' },

  // Huiles
  'huile_friture': { ref: 'DIS-120', nom: 'Huile de Friture 10L', prix: 24.90, unite: 'bidon', categorie: 'huiles' },
  'huile_olive': { ref: 'DIS-121', nom: 'Huile d\'Olive 5L', prix: 32.90, unite: 'bidon', categorie: 'huiles' },

  // Emballages
  'boite_kebab': { ref: 'EMB-001', nom: 'Boîte Kebab Carton x200', prix: 28.90, unite: 'carton', categorie: 'emballages' },
  'boite_burger': { ref: 'EMB-002', nom: 'Boîte Burger x200', prix: 24.90, unite: 'carton', categorie: 'emballages' },
  'barquette_frites': { ref: 'EMB-003', nom: 'Barquette Frites x500', prix: 32.90, unite: 'carton', categorie: 'emballages' },
  'sachet_kraft': { ref: 'EMB-004', nom: 'Sac Kraft x500', prix: 45.90, unite: 'carton', categorie: 'emballages' },
  'gobelet_50cl': { ref: 'EMB-005', nom: 'Gobelet 50cl x500', prix: 38.90, unite: 'carton', categorie: 'emballages' },
  'serviette': { ref: 'EMB-006', nom: 'Serviettes x1000', prix: 12.90, unite: 'carton', categorie: 'emballages' },
  'couverts_jetables': { ref: 'EMB-007', nom: 'Kit Couverts x200', prix: 18.90, unite: 'carton', categorie: 'emballages' },
  'sac_livraison': { ref: 'EMB-008', nom: 'Sac Livraison x200', prix: 35.90, unite: 'carton', categorie: 'emballages' },
};

// Menu type detection patterns
const MENU_PATTERNS = {
  kebab: ['kebab', 'döner', 'doner', 'shawarma', 'pita', 'durum', 'galette'],
  burger: ['burger', 'hamburger', 'cheeseburger', 'double', 'bacon', 'smash'],
  tacos: ['tacos', 'taco', 'burrito', 'quesadilla', 'tortilla', 'mexicain'],
  pizza: ['pizza', 'margherita', 'calzone', 'pepperoni', 'napolitaine'],
  snack: ['sandwich', 'panini', 'croque', 'wrap', 'salade', 'grec'],
};

export default function ScanMenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'produits' | 'emballages'>('produits');
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Le fichier est trop volumineux (max 10MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectMenuType = (text: string): string => {
    const lowerText = text.toLowerCase();
    for (const [type, patterns] of Object.entries(MENU_PATTERNS)) {
      if (patterns.some(p => lowerText.includes(p))) {
        return type;
      }
    }
    return 'snack';
  };

  const generateProductRecommendations = (menuType: string, plats: string[]): ProduitRecommande[] => {
    const recommendations: ProduitRecommande[] = [];
    const baseProducts: string[] = [];

    // Base products by menu type
    switch (menuType) {
      case 'kebab':
        baseProducts.push('viande_kebab', 'viande_shawarma', 'pain_pita', 'galette_wrap',
          'sauce_blanche', 'sauce_samourai', 'sauce_algerienne', 'salade_melangee',
          'tomates', 'oignons', 'chou_blanc', 'frites_surgelees', 'huile_friture');
        break;
      case 'burger':
        baseProducts.push('steaks_burger', 'pain_burger', 'cheddar', 'sauce_burger',
          'ketchup', 'mayonnaise', 'moutarde', 'salade_melangee', 'tomates', 'oignons',
          'cornichons', 'frites_surgelees', 'onion_rings', 'huile_friture');
        break;
      case 'tacos':
        baseProducts.push('viande_kebab', 'poulet_grille', 'boeuf_hache', 'tortilla',
          'sauce_blanche', 'sauce_samourai', 'sauce_harissa', 'emmental_rape',
          'salade_melangee', 'tomates', 'oignons', 'frites_surgelees', 'huile_friture');
        break;
      default:
        baseProducts.push('poulet_grille', 'pain_sandwich', 'salade_melangee', 'tomates',
          'mayonnaise', 'moutarde', 'frites_surgelees', 'huile_friture');
    }

    // Add base products
    baseProducts.forEach(productKey => {
      const product = DISTRAM_CATALOG[productKey];
      if (product) {
        const qtyMultiplier = ['viandes', 'frites'].includes(product.categorie) ? 3 : 2;
        recommendations.push({
          ref: product.ref,
          nom: product.nom,
          categorie: product.categorie,
          quantite: qtyMultiplier,
          unite: product.unite,
          prixUnitaire: product.prix,
          totalHT: product.prix * qtyMultiplier,
          raison: `Base ${menuType}`,
          obligatoire: true,
          selected: true,
        });
      }
    });

    return recommendations;
  };

  const generateEmballageRecommendations = (menuType: string): ProduitRecommande[] => {
    const emballages: ProduitRecommande[] = [];
    const baseEmballages = ['serviette', 'sachet_kraft', 'gobelet_50cl'];

    switch (menuType) {
      case 'kebab':
        baseEmballages.push('boite_kebab', 'barquette_frites');
        break;
      case 'burger':
        baseEmballages.push('boite_burger', 'barquette_frites');
        break;
      default:
        baseEmballages.push('boite_kebab', 'barquette_frites');
    }

    baseEmballages.forEach(productKey => {
      const product = DISTRAM_CATALOG[productKey];
      if (product) {
        emballages.push({
          ref: product.ref,
          nom: product.nom,
          categorie: product.categorie,
          quantite: 1,
          unite: product.unite,
          prixUnitaire: product.prix,
          totalHT: product.prix,
          raison: 'Emballage standard',
          obligatoire: true,
          selected: true,
        });
      }
    });

    return emballages;
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Extract base64 data
      const base64Data = selectedImage.split(',')[1];

      // Call OpenAI Vision API
      const analysis = await analyzeMenuImage(base64Data);

      if (!analysis) {
        throw new Error('Impossible d\'analyser l\'image');
      }

      const menuType = detectMenuType(analysis.platsDetectes.map(p => p.nom).join(' '));
      const produitsRecommandes = generateProductRecommendations(menuType, analysis.platsDetectes.map(p => p.nom));
      const emballagesRecommandes = generateEmballageRecommendations(menuType);

      const totalProduitsHT = produitsRecommandes.reduce((sum, p) => sum + p.totalHT, 0);
      const totalEmballagesHT = emballagesRecommandes.reduce((sum, p) => sum + p.totalHT, 0);
      const totalHT = totalProduitsHT + totalEmballagesHT;
      const totalTTC = totalHT * 1.2;

      const result: ScanResult = {
        success: true,
        tempsAnalyse: (Date.now() - startTime) / 1000,
        restaurant: {
          type: menuType,
          specialite: analysis.specialite,
        },
        platsDetectes: analysis.platsDetectes.map(p => ({
          ...p,
          confiance: p.confiance || 0.85,
          ventesEstimees: p.ventesEstimees || Math.floor(Math.random() * 50) + 20,
        })),
        produitsRecommandes,
        emballagesRecommandes,
        totalProduitsHT,
        totalEmballagesHT,
        totalHT,
        totalTTC,
        margeEstimee: 35,
        notes: analysis.notes || [
          'Analyse basée sur les produits détectés dans le menu',
          'Quantités estimées pour une semaine d\'activité standard',
        ],
      };

      setResult(result);

      // Sauvegarder dans l'historique Firebase
      try {
        const base64Data = selectedImage.split(',')[1];
        const scanId = await saveScanToHistory({
          tempsAnalyse: result.tempsAnalyse,
          restaurant: result.restaurant,
          platsDetectes: result.platsDetectes.map(p => ({
            nom: p.nom,
            categorie: p.categorie,
            confiance: p.confiance,
            ventesEstimees: p.ventesEstimees,
          })),
          nbProduits: result.produitsRecommandes.length,
          nbEmballages: result.emballagesRecommandes.length,
          totalHT: result.totalHT,
          totalTTC: result.totalTTC,
          margeEstimee: result.margeEstimee,
          devisGenere: false,
          commandeConvertie: false,
          commercialId: user?.uid || 'demo',
          commercialNom: user?.displayName || user?.email || 'Commercial',
          depot: user?.depot || 'lyon',
          source: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }, base64Data);

        setCurrentScanId(scanId);
        console.log('Scan sauvegardé:', scanId);
      } catch (saveError) {
        console.warn('Erreur sauvegarde historique (non-bloquant):', saveError);
      }
    } catch (err: unknown) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateQuantity = useCallback((index: number, delta: number, type: 'produits' | 'emballages') => {
    if (!result) return;

    setResult(prev => {
      if (!prev) return prev;

      const items = type === 'produits' ? [...prev.produitsRecommandes] : [...prev.emballagesRecommandes];
      const newQty = Math.max(0, items[index].quantite + delta);
      items[index] = {
        ...items[index],
        quantite: newQty,
        totalHT: items[index].prixUnitaire * newQty,
      };

      const totalProduitsHT = (type === 'produits' ? items : prev.produitsRecommandes)
        .reduce((sum, p) => sum + p.totalHT, 0);
      const totalEmballagesHT = (type === 'emballages' ? items : prev.emballagesRecommandes)
        .reduce((sum, p) => sum + p.totalHT, 0);

      return {
        ...prev,
        produitsRecommandes: type === 'produits' ? items : prev.produitsRecommandes,
        emballagesRecommandes: type === 'emballages' ? items : prev.emballagesRecommandes,
        totalProduitsHT,
        totalEmballagesHT,
        totalHT: totalProduitsHT + totalEmballagesHT,
        totalTTC: (totalProduitsHT + totalEmballagesHT) * 1.2,
      };
    });
  }, [result]);

  const handleCreateQuote = () => {
    if (!result) return;
    setShowClientForm(true);
  };

  const handleSendQuote = () => {
    if (!result || !clientInfo.nom) return;

    const devisData = {
      source: 'scan_menu',
      client: clientInfo,
      restaurant: result.restaurant,
      platsDetectes: result.platsDetectes,
      produitsRecommandes: result.produitsRecommandes.filter(p => p.quantite > 0),
      emballagesRecommandes: result.emballagesRecommandes.filter(p => p.quantite > 0),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        title="IA Scan Menu"
        subtitle="Photographiez un menu, obtenez un devis en 30 secondes"
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/scan-menu/historique')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            Historique
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero card */}
        <Card className="mb-6 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white border-0 shadow-xl overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
            <div className="relative flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">La Killer Feature DISTRAM</h2>
                <p className="text-orange-100 text-lg">
                  1. Photographiez le menu du client → 2. GPT-4o Vision identifie les plats → 3. Devis personnalisé en 30s
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-2 bg-white/20 rounded-full px-5 py-3 backdrop-blur-sm">
                <Zap className="w-6 h-6" />
                <span className="font-semibold text-lg">GPT-4o Vision</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="w-6 h-6 text-orange-600" />
                Scanner un Menu
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
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-orange-600" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Cliquez pour scanner
                  </p>
                  <p className="text-gray-500">
                    ou glissez-déposez une photo de menu
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Badge variant="outline">PNG</Badge>
                    <Badge variant="outline">JPG</Badge>
                    <Badge variant="outline">Max 10MB</Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                    <img
                      src={selectedImage}
                      alt="Menu uploadé"
                      className="w-full h-72 object-contain"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setResult(null);
                        setError(null);
                      }}
                      className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 gap-2 h-14 text-lg shadow-lg"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyse GPT-4o en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Analyser avec GPT-4o Vision
                      </>
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Résultats de l'Analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result && !isAnalyzing && (
                <div className="text-center py-16 text-gray-400">
                  <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Uploadez un menu pour commencer</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                  </div>
                  <p className="text-gray-900 font-semibold text-lg">Analyse GPT-4o Vision en cours...</p>
                  <p className="text-gray-500 mt-2">Identification des plats et calcul des quantités</p>
                </div>
              )}

              {result && result.success && (
                <div className="space-y-5">
                  {/* Restaurant type */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{getTypeIcon(result.restaurant.type)}</span>
                      <div>
                        <p className="font-bold text-blue-900 text-lg capitalize">
                          Restaurant {result.restaurant.type}
                        </p>
                        {result.restaurant.specialite && (
                          <p className="text-blue-700">{result.restaurant.specialite}</p>
                        )}
                      </div>
                      <Badge className="ml-auto bg-blue-600">{result.tempsAnalyse.toFixed(1)}s</Badge>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        Analyse terminée
                      </span>
                    </div>
                    <p className="text-green-700">
                      <span className="font-bold">{result.platsDetectes.length}</span> plats détectés •
                      <span className="font-bold"> {result.produitsRecommandes.length}</span> produits •
                      <span className="font-bold"> {result.emballagesRecommandes.length}</span> emballages
                    </p>
                  </div>

                  {/* Detected dishes */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-orange-600" />
                      Plats détectés
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {result.platsDetectes.map((plat, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{plat.nom}</p>
                            <p className="text-sm text-gray-500">
                              ~{plat.ventesEstimees} ventes/sem • {Math.round(plat.confiance * 100)}% confiance
                            </p>
                          </div>
                          <Badge variant="secondary" className="capitalize">{plat.categorie}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalHT)}</p>
                        <p className="text-sm text-gray-500">Total HT</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalTTC)}</p>
                        <p className="text-sm text-gray-500">Total TTC</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-2xl font-bold text-green-600">{result.margeEstimee}%</p>
                        <p className="text-sm text-gray-500">Marge</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateQuote}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 gap-2 h-12"
                    >
                      <Send className="w-5 h-5" />
                      Créer & Envoyer le Devis
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Form Modal */}
        {showClientForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-orange-600" />
                  Informations Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom du Restaurant *</Label>
                  <Input
                    id="nom"
                    value={clientInfo.nom}
                    onChange={(e) => setClientInfo({...clientInfo, nom: e.target.value})}
                    placeholder="Ex: Kebab Istanbul"
                  />
                </div>
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="adresse"
                      value={clientInfo.adresse}
                      onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                      className="pl-10"
                      placeholder="15 Rue de la République, Lyon"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="telephone"
                      value={clientInfo.telephone}
                      onChange={(e) => setClientInfo({...clientInfo, telephone: e.target.value})}
                      className="pl-10"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({...clientInfo, email: e.target.value})}
                    placeholder="contact@restaurant.fr"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowClientForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    onClick={handleSendQuote}
                    disabled={!clientInfo.nom}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Générer le Devis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products & Emballages tables */}
        {result && result.success && (
          <>
            {/* Tab buttons */}
            <div className="flex gap-3 mt-8 mb-4">
              <Button
                variant={activeTab === 'produits' ? 'default' : 'outline'}
                onClick={() => setActiveTab('produits')}
                className={`gap-2 ${activeTab === 'produits' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                <Store className="w-4 h-4" />
                Produits DISTRAM ({result.produitsRecommandes.length})
              </Button>
              <Button
                variant={activeTab === 'emballages' ? 'default' : 'outline'}
                onClick={() => setActiveTab('emballages')}
                className={`gap-2 ${activeTab === 'emballages' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                <Package className="w-4 h-4" />
                Emballages ({result.emballagesRecommandes.length})
              </Button>
            </div>

            {/* Products table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {activeTab === 'produits' ? (
                    <><Store className="w-5 h-5 text-orange-600" /> Produits Recommandés</>
                  ) : (
                    <><Package className="w-5 h-5 text-orange-600" /> Emballages Recommandés</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Réf</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Quantité</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">P.U. HT</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(activeTab === 'produits' ? result.produitsRecommandes : result.emballagesRecommandes).map((item, index) => (
                        <tr key={index} className={`hover:bg-orange-50 transition-colors ${item.quantite === 0 ? 'opacity-40' : ''}`}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">{item.ref}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.nom}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">{item.categorie}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(index, -1, activeTab)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantite}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(index, 1, activeTab)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(item.prixUnitaire)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(item.totalHT)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-orange-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-sm font-bold text-gray-900 text-right">
                          Total {activeTab === 'produits' ? 'Produits' : 'Emballages'} HT
                        </td>
                        <td className="px-4 py-4 text-lg font-bold text-orange-600 text-right">
                          {formatCurrency(activeTab === 'produits' ? result.totalProduitsHT : result.totalEmballagesHT)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Final total */}
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-orange-100">Total Commande</p>
                      <p className="text-3xl font-bold">{formatCurrency(result.totalTTC)}</p>
                      <p className="text-orange-200 text-sm">TTC (HT: {formatCurrency(result.totalHT)})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-100">Marge Estimée</p>
                      <p className="text-3xl font-bold">{result.margeEstimee}%</p>
                      <p className="text-orange-200 text-sm">~{formatCurrency(result.totalHT * result.margeEstimee / 100)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

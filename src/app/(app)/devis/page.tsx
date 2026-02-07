'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Trash2,
  Download,
  Save,
  Search,
  CheckCircle,
  Clock,
  Euro,
  Mail,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CATALOGUE_DISTRAM } from '@/data/catalogue-distram';

interface DevisLigne {
  id: string;
  produitId: string;
  nom: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
}

export default function DevisPage() {
  const [client, setClient] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  });
  const [lignes, setLignes] = useState<DevisLigne[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const envoyerParEmail = async () => {
    if (!client.email) {
      showToast('Email client requis');
      return;
    }

    if (lignes.length === 0) {
      showToast('Ajoutez des produits au devis');
      return;
    }

    setSendingEmail(true);

    try {
      const devisId = `DEV-${Date.now()}`;
      const token = btoa(`${devisId}-${Date.now()}`).replace(/=/g, '');
      const lienDevis = `${window.location.origin}/devis/public/${token}`;

      // Préparer le devis pour l'API
      const devisData = {
        id: devisId,
        numero: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
        dateCreation: new Date(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'envoye',
        clientNom: client.nom,
        clientEmail: client.email,
        clientTelephone: client.telephone,
        clientAdresse: client.adresse,
        commercialId: '',
        commercialNom: 'Commercial DISTRAM',
        commercialEmail: 'commercial@distram.fr',
        depot: 'lyon',
        lignesProduits: lignes.map(l => ({
          id: l.id,
          ref: l.produitId,
          nom: l.nom,
          categorie: '',
          quantite: l.quantite,
          unite: 'unité',
          prixUnitaire: l.prixUnitaire,
          remise: l.remise,
          totalHT: l.quantite * l.prixUnitaire * (1 - l.remise / 100),
          obligatoire: true
        })),
        lignesEmballages: [],
        totalProduitsHT: sousTotal,
        totalEmballagesHT: 0,
        remiseGlobale: 0,
        totalHT: sousTotal,
        tva: tva,
        totalTTC: total,
        conditionsPaiement: 'Paiement à 30 jours',
        delaiLivraison: 'Livraison sous 48-72h',
        validite: 30,
        source: 'manuel',
        tokenPartage: token,
        lienPartage: lienDevis
      };

      const response = await fetch('/api/email/send-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devis: devisData,
          lienDevis,
          includeDetails: true
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast(`Email envoyé à ${client.email}`);
      } else {
        showToast(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      showToast('Erreur lors de l\'envoi');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredProducts = CATALOGUE_DISTRAM.filter(p =>
    p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categorie.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const addProduct = (product: typeof CATALOGUE_DISTRAM[0]) => {
    const existingLigne = lignes.find(l => l.produitId === product.ref);
    if (existingLigne) {
      setLignes(lignes.map(l =>
        l.produitId === product.ref
          ? { ...l, quantite: l.quantite + 1 }
          : l
      ));
    } else {
      setLignes([...lignes, {
        id: Date.now().toString(),
        produitId: product.ref,
        nom: product.nom,
        quantite: 1,
        prixUnitaire: product.prix,
        remise: 0
      }]);
    }
    setSearchQuery('');
  };

  const updateLigne = (id: string, field: keyof DevisLigne, value: number) => {
    setLignes(lignes.map(l =>
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  const removeLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id !== id));
  };

  const sousTotal = lignes.reduce((sum, l) => {
    const ligneTotal = l.quantite * l.prixUnitaire * (1 - l.remise / 100);
    return sum + ligneTotal;
  }, 0);

  const tva = sousTotal * 0.20;
  const total = sousTotal + tva;

  const recentDevis = [
    { id: 'DEV-2026-001', client: "O'Tacos Lyon 7", date: '28/01/2026', montant: 2450, status: 'accepte' },
    { id: 'DEV-2026-002', client: 'Pizza Napoli', date: '27/01/2026', montant: 1890, status: 'en_attente' },
    { id: 'DEV-2026-003', client: 'Istanbul Kebab', date: '25/01/2026', montant: 3200, status: 'accepte' },
    { id: 'DEV-2026-004', client: 'Burger Factory', date: '24/01/2026', montant: 1560, status: 'refuse' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepte':
        return <Badge className="bg-green-100 text-green-800">Accepté</Badge>;
      case 'en_attente':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'refuse':
        return <Badge className="bg-red-100 text-red-800">Refusé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <Header
        title="Devis"
        subtitle="Créez et gérez vos devis clients"
      />

      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Devis form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Nouveau devis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du client *
                    </label>
                    <Input
                      value={client.nom}
                      onChange={(e) => setClient({ ...client, nom: e.target.value })}
                      placeholder="O'Tacos Lyon 7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={client.email}
                      onChange={(e) => setClient({ ...client, email: e.target.value })}
                      placeholder="contact@otacos.fr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <Input
                      value={client.telephone}
                      onChange={(e) => setClient({ ...client, telephone: e.target.value })}
                      placeholder="04 78 XX XX XX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <Input
                      value={client.adresse}
                      onChange={(e) => setClient({ ...client, adresse: e.target.value })}
                      placeholder="128 Avenue Jean Jaurès, 69007 Lyon"
                    />
                  </div>
                </div>

                {/* Product search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ajouter un produit
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="pl-10"
                    />
                  </div>
                  {searchQuery && filteredProducts.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-w-md bg-white border rounded-lg shadow-lg">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.ref}
                          onClick={() => addProduct(product)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{product.nom}</p>
                            <p className="text-sm text-gray-500">{product.categorie}</p>
                          </div>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(product.prix)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lines */}
                {lignes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qté</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Remise %</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lignes.map((ligne) => {
                          const ligneTotal = ligne.quantite * ligne.prixUnitaire * (1 - ligne.remise / 100);
                          return (
                            <tr key={ligne.id}>
                              <td className="px-3 py-2 font-medium text-gray-900">{ligne.nom}</td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(ligne.id, 'quantite', parseInt(e.target.value) || 1)}
                                  className="w-20 text-center mx-auto"
                                />
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {formatCurrency(ligne.prixUnitaire)}
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={ligne.remise}
                                  onChange={(e) => updateLigne(ligne.id, 'remise', parseInt(e.target.value) || 0)}
                                  className="w-20 text-center mx-auto"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {formatCurrency(ligneTotal)}
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLigne(ligne.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Recherchez et ajoutez des produits au devis</p>
                  </div>
                )}

                {/* Totals */}
                {lignes.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-gray-600">
                          <span>Sous-total HT</span>
                          <span>{formatCurrency(sousTotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>TVA (20%)</span>
                          <span>{formatCurrency(tva)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                          <span>Total TTC</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" className="gap-2">
                    <Save className="w-4 h-4" />
                    Brouillon
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={envoyerParEmail}
                    disabled={sendingEmail || !client.email || lignes.length === 0}
                    className="bg-orange-600 hover:bg-orange-700 gap-2 flex-1"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Envoyer par email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ce mois</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>Devis envoyés</span>
                  </div>
                  <span className="font-bold text-gray-900">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Acceptés</span>
                  </div>
                  <span className="font-bold text-green-600">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Euro className="w-4 h-4" />
                    <span>CA généré</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(45600)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span>En attente</span>
                  </div>
                  <span className="font-bold text-yellow-600">4</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent devis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Devis récents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentDevis.map((devis) => (
                  <div
                    key={devis.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{devis.id}</span>
                      {getStatusBadge(devis.status)}
                    </div>
                    <p className="text-sm text-gray-600">{devis.client}</p>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-500">{devis.date}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(devis.montant)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

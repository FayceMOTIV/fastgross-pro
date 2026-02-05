'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import {
  Save, Send, FileText, Plus, Trash2,
  ArrowLeft, Download, Copy, Mail, Loader2,
  Check, X, Clock, ShoppingCart, Package, Store
} from 'lucide-react';
import { Devis, LigneDevis, DevisStatus } from '@/types/devis';
import { CATALOGUE_DISTRAM } from '@/data/catalogue-distram-complet';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { formatCurrency } from '@/lib/utils';

const STATUS_CONFIG: Record<DevisStatus, { label: string; color: string; icon: any }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-500', icon: FileText },
  envoye: { label: 'Envoye', color: 'bg-blue-500', icon: Send },
  consulte: { label: 'Consulte', color: 'bg-purple-500', icon: Clock },
  accepte: { label: 'Accepte', color: 'bg-green-500', icon: Check },
  refuse: { label: 'Refuse', color: 'bg-red-500', icon: X },
  negocie: { label: 'En negociation', color: 'bg-orange-500', icon: Clock },
  expire: { label: 'Expire', color: 'bg-gray-400', icon: Clock },
  converti: { label: 'Converti', color: 'bg-green-600', icon: ShoppingCart },
};

interface DevisEditorClientProps {
  devisId: string;
}

export default function DevisEditorClient({ devisId }: DevisEditorClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductType, setAddProductType] = useState<'produits' | 'emballages'>('produits');
  const [searchProduct, setSearchProduct] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const isNew = devisId === 'nouveau';

  useEffect(() => {
    if (isNew) {
      // Check for scan menu data in localStorage
      const scanData = localStorage.getItem('scanMenuDevisData');
      let lignesProduits: LigneDevis[] = [];
      let lignesEmballages: LigneDevis[] = [];
      let clientType = '';

      if (scanData) {
        const data = JSON.parse(scanData);
        clientType = data.restaurant?.type || '';

        // Convert products from scan
        if (data.produitsRecommandes) {
          lignesProduits = data.produitsRecommandes.map((p: any, i: number) => ({
            id: `ligne-prod-${i}`,
            ref: p.ref,
            nom: p.nom,
            categorie: p.categorie,
            quantite: p.quantite,
            unite: p.unite,
            prixUnitaire: p.prixUnitaire,
            remise: 0,
            totalHT: p.totalHT,
            raison: p.raison,
            obligatoire: p.obligatoire,
          }));
        }

        // Convert emballages from scan
        if (data.emballagesRecommandes) {
          lignesEmballages = data.emballagesRecommandes.map((p: any, i: number) => ({
            id: `ligne-emb-${i}`,
            ref: p.ref,
            nom: p.nom,
            categorie: p.categorie,
            quantite: p.quantite,
            unite: p.unite,
            prixUnitaire: p.prixUnitaire,
            remise: 0,
            totalHT: p.totalHT,
            raison: p.raison,
            obligatoire: p.obligatoire,
          }));
        }

        // Clear localStorage
        localStorage.removeItem('scanMenuDevisData');
      }

      // Create new devis
      const newDevis: Devis = {
        id: `DEV-${Date.now()}`,
        numero: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
        dateCreation: new Date(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'brouillon',
        clientNom: '',
        clientType: clientType,
        commercialId: user?.uid || '',
        commercialNom: user?.displayName || user?.email || '',
        commercialEmail: user?.email || '',
        depot: 'lyon',
        lignesProduits,
        lignesEmballages,
        totalProduitsHT: lignesProduits.reduce((sum, l) => sum + l.totalHT, 0),
        totalEmballagesHT: lignesEmballages.reduce((sum, l) => sum + l.totalHT, 0),
        remiseGlobale: 0,
        totalHT: 0,
        tva: 0,
        totalTTC: 0,
        conditionsPaiement: 'Paiement a 30 jours',
        delaiLivraison: 'Livraison sous 48-72h',
        validite: 30,
        source: scanData ? 'scan_menu' : 'manuel',
      };

      // Recalculate totals
      const calculated = recalculerTotaux(newDevis);
      setDevis(calculated);
      setLoading(false);
    } else {
      loadDevis();
    }
  }, [devisId, isNew, user]);

  const loadDevis = async () => {
    try {
      const docRef = doc(db, 'devis', devisId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDevis({
          id: docSnap.id,
          ...data,
          dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation),
          dateExpiration: data.dateExpiration?.toDate?.() || new Date(data.dateExpiration),
        } as Devis);
      } else {
        showToast('Devis non trouve');
        router.push('/devis');
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      showToast('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const recalculerTotaux = (d: Devis): Devis => {
    const totalProduitsHT = d.lignesProduits.reduce((sum, l) => {
      const totalLigne = l.quantite * l.prixUnitaire * (1 - l.remise / 100);
      return sum + totalLigne;
    }, 0);

    const totalEmballagesHT = d.lignesEmballages.reduce((sum, l) => {
      const totalLigne = l.quantite * l.prixUnitaire * (1 - l.remise / 100);
      return sum + totalLigne;
    }, 0);

    const sousTotal = totalProduitsHT + totalEmballagesHT;
    const totalHT = sousTotal * (1 - d.remiseGlobale / 100);
    const tva = totalHT * 0.2;
    const totalTTC = totalHT + tva;

    return {
      ...d,
      totalProduitsHT: Math.round(totalProduitsHT * 100) / 100,
      totalEmballagesHT: Math.round(totalEmballagesHT * 100) / 100,
      totalHT: Math.round(totalHT * 100) / 100,
      tva: Math.round(tva * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
    };
  };

  const updateDevis = (updates: Partial<Devis>) => {
    if (!devis) return;
    const updated = recalculerTotaux({ ...devis, ...updates });
    setDevis(updated);
  };

  const updateLigne = (type: 'produits' | 'emballages', index: number, updates: Partial<LigneDevis>) => {
    if (!devis) return;

    const lignes = type === 'produits' ? [...devis.lignesProduits] : [...devis.lignesEmballages];
    const ligne = lignes[index];
    const newQuantite = updates.quantite ?? ligne.quantite;
    const newPrixUnitaire = updates.prixUnitaire ?? ligne.prixUnitaire;
    const newRemise = updates.remise ?? ligne.remise;

    lignes[index] = {
      ...ligne,
      ...updates,
      totalHT: newQuantite * newPrixUnitaire * (1 - newRemise / 100)
    };

    updateDevis({
      [type === 'produits' ? 'lignesProduits' : 'lignesEmballages']: lignes
    });
  };

  const supprimerLigne = (type: 'produits' | 'emballages', index: number) => {
    if (!devis) return;

    const lignes = type === 'produits' ? [...devis.lignesProduits] : [...devis.lignesEmballages];
    lignes.splice(index, 1);

    updateDevis({
      [type === 'produits' ? 'lignesProduits' : 'lignesEmballages']: lignes
    });
  };

  const ajouterProduit = (produit: typeof CATALOGUE_DISTRAM[0]) => {
    if (!devis) return;

    const type = produit.categorie === 'Emballages' ? 'emballages' : 'produits';

    const nouvelleLigne: LigneDevis = {
      id: `ligne-${Date.now()}`,
      ref: produit.ref,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      unite: produit.unite,
      prixUnitaire: produit.prixVenteHT,
      remise: 0,
      totalHT: produit.prixVenteHT,
      obligatoire: true,
    };

    const lignes = type === 'produits' ? [...devis.lignesProduits] : [...devis.lignesEmballages];
    lignes.push(nouvelleLigne);

    updateDevis({
      [type === 'produits' ? 'lignesProduits' : 'lignesEmballages']: lignes
    });

    setShowAddProduct(false);
    setSearchProduct('');
  };

  const sauvegarder = async () => {
    if (!devis) return;
    setSaving(true);

    try {
      const docRef = doc(db, 'devis', devis.id);
      await setDoc(docRef, {
        ...devis,
        dateCreation: devis.dateCreation,
        dateExpiration: devis.dateExpiration,
      });

      showToast('Devis sauvegarde');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showToast('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const envoyerDevis = async () => {
    if (!devis || !devis.clientEmail) {
      showToast('Email client requis');
      return;
    }

    setSendingEmail(true);
    const token = btoa(`${devis.id}-${Date.now()}`).replace(/=/g, '');
    const lienPartage = `${window.location.origin}/devis/public/${token}`;

    const updated = {
      ...devis,
      status: 'envoye' as DevisStatus,
      dateEnvoi: new Date(),
      tokenPartage: token,
      lienPartage,
    };

    try {
      // Envoyer l'email via l'API
      const emailResponse = await fetch('/api/email/send-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devis: updated,
          lienDevis: lienPartage,
          includeDetails: true
        })
      });

      const emailResult = await emailResponse.json();

      if (!emailResult.success) {
        // Si l'email échoue (ex: SendGrid non configuré), on continue quand même
        console.warn('Email non envoyé:', emailResult.error);
        showToast('Devis prêt (email non envoyé)');
      } else {
        showToast('Email envoyé au client !');
      }

      // Sauvegarder le devis avec le nouveau statut
      setDevis(updated);
      const docRef = doc(db, 'devis', devis.id);
      await setDoc(docRef, updated);
      navigator.clipboard.writeText(lienPartage);

    } catch (error) {
      console.error('Erreur envoi:', error);
      showToast('Erreur envoi');
    } finally {
      setSendingEmail(false);
    }
  };

  const convertirEnCommande = async () => {
    if (!devis) return;

    const commandeId = `CMD-${Date.now()}`;
    const updated = {
      ...devis,
      status: 'converti' as DevisStatus,
      commandeId,
    };

    setDevis(updated);

    try {
      const docRef = doc(db, 'devis', devis.id);
      await setDoc(docRef, updated);
      showToast(`Commande ${commandeId} creee !`);
      router.push('/commandes');
    } catch (error) {
      console.error('Erreur conversion:', error);
      showToast('Erreur conversion');
    }
  };

  const filteredProducts = CATALOGUE_DISTRAM.filter(p => {
    const matchesSearch =
      p.nom.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.ref.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.tags.some(t => t.includes(searchProduct.toLowerCase()));

    if (addProductType === 'emballages') {
      return matchesSearch && p.categorie === 'Emballages';
    }
    return matchesSearch && p.categorie !== 'Emballages';
  });

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Chargement..." subtitle="" />
        <div className="p-8 text-center">Chargement du devis...</div>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="min-h-screen">
        <Header title="Erreur" subtitle="" />
        <div className="p-8 text-center">Devis non trouve</div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[devis.status];
  const StatusIcon = statusConfig.icon;
  const isEditable = devis.status === 'brouillon' || devis.status === 'negocie';

  return (
    <div className="min-h-screen pb-8">
      <Header
        title={`Devis ${devis.numero}`}
        subtitle={isNew ? 'Nouveau devis' : `Status: ${statusConfig.label}`}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/devis')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Badge className={`${statusConfig.color} text-white`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex gap-2">
            {isEditable && (
              <>
                <Button variant="outline" onClick={sauvegarder} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button
                  onClick={envoyerDevis}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Envoyer par email
                    </>
                  )}
                </Button>
              </>
            )}

            {devis.status === 'accepte' && (
              <Button onClick={convertirEnCommande} className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Creer commande
              </Button>
            )}

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations client</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nom / Societe *</label>
                  <Input
                    value={devis.clientNom}
                    onChange={(e) => updateDevis({ clientNom: e.target.value })}
                    placeholder="Restaurant Istanbul"
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={devis.clientEmail || ''}
                    onChange={(e) => updateDevis({ clientEmail: e.target.value })}
                    placeholder="contact@restaurant.fr"
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telephone</label>
                  <Input
                    value={devis.clientTelephone || ''}
                    onChange={(e) => updateDevis({ clientTelephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Input
                    value={devis.clientType || ''}
                    onChange={(e) => updateDevis({ clientType: e.target.value })}
                    placeholder="Burger, Kebab..."
                    disabled={!isEditable}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    value={devis.clientAdresse || ''}
                    onChange={(e) => updateDevis({ clientAdresse: e.target.value })}
                    placeholder="123 rue de la Republique, 69001 Lyon"
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Produits ({devis.lignesProduits.length})
                </CardTitle>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddProductType('produits');
                      setShowAddProduct(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {devis.lignesProduits.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun produit</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Ref</th>
                          <th className="text-left py-2">Produit</th>
                          <th className="text-right py-2">Qte</th>
                          <th className="text-right py-2">P.U.</th>
                          <th className="text-right py-2">Remise</th>
                          <th className="text-right py-2">Total HT</th>
                          {isEditable && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {devis.lignesProduits.map((ligne, index) => (
                          <tr key={ligne.id} className="border-b">
                            <td className="py-2 text-gray-500 font-mono text-xs">{ligne.ref}</td>
                            <td className="py-2">{ligne.nom}</td>
                            <td className="py-2 text-right">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="w-20 text-right h-8"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne('produits', index, { quantite: parseInt(e.target.value) || 0 })}
                                />
                              ) : ligne.quantite}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(ligne.prixUnitaire)}</td>
                            <td className="py-2 text-right">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="w-16 text-right h-8"
                                  value={ligne.remise}
                                  onChange={(e) => updateLigne('produits', index, { remise: parseFloat(e.target.value) || 0 })}
                                />
                              ) : `${ligne.remise}%`}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {formatCurrency(ligne.quantite * ligne.prixUnitaire * (1 - ligne.remise / 100))}
                            </td>
                            {isEditable && (
                              <td className="py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => supprimerLigne('produits', index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-gray-50">
                          <td colSpan={5} className="py-2 text-right">Sous-total Produits HT</td>
                          <td className="py-2 text-right">{formatCurrency(devis.totalProduitsHT)}</td>
                          {isEditable && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emballages */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Emballages ({devis.lignesEmballages.length})
                </CardTitle>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddProductType('emballages');
                      setShowAddProduct(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {devis.lignesEmballages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun emballage</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Ref</th>
                          <th className="text-left py-2">Emballage</th>
                          <th className="text-right py-2">Qte</th>
                          <th className="text-right py-2">P.U.</th>
                          <th className="text-right py-2">Remise</th>
                          <th className="text-right py-2">Total HT</th>
                          {isEditable && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {devis.lignesEmballages.map((ligne, index) => (
                          <tr key={ligne.id} className="border-b">
                            <td className="py-2 text-gray-500 font-mono text-xs">{ligne.ref}</td>
                            <td className="py-2">{ligne.nom}</td>
                            <td className="py-2 text-right">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="w-20 text-right h-8"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne('emballages', index, { quantite: parseInt(e.target.value) || 0 })}
                                />
                              ) : ligne.quantite}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(ligne.prixUnitaire)}</td>
                            <td className="py-2 text-right">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="w-16 text-right h-8"
                                  value={ligne.remise}
                                  onChange={(e) => updateLigne('emballages', index, { remise: parseFloat(e.target.value) || 0 })}
                                />
                              ) : `${ligne.remise}%`}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {formatCurrency(ligne.quantite * ligne.prixUnitaire * (1 - ligne.remise / 100))}
                            </td>
                            {isEditable && (
                              <td className="py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => supprimerLigne('emballages', index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-gray-50">
                          <td colSpan={5} className="py-2 text-right">Sous-total Emballages HT</td>
                          <td className="py-2 text-right">{formatCurrency(devis.totalEmballagesHT)}</td>
                          {isEditable && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message */}
            <Card>
              <CardHeader>
                <CardTitle>Message pour le client</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={devis.messageClient || ''}
                  onChange={(e) => updateDevis({ messageClient: e.target.value })}
                  placeholder="Bonjour, suite a notre echange, voici notre proposition..."
                  rows={4}
                  disabled={!isEditable}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Recapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Produits HT</span>
                  <span>{formatCurrency(devis.totalProduitsHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emballages HT</span>
                  <span>{formatCurrency(devis.totalEmballagesHT)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span>Remise globale</span>
                  {isEditable ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-16 text-right h-8"
                        value={devis.remiseGlobale}
                        onChange={(e) => updateDevis({ remiseGlobale: parseFloat(e.target.value) || 0 })}
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <span>{devis.remiseGlobale}%</span>
                  )}
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Total HT</span>
                  <span>{formatCurrency(devis.totalHT)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>TVA (20%)</span>
                  <span>{formatCurrency(devis.tva)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-xl font-bold text-orange-600">
                  <span>Total TTC</span>
                  <span>{formatCurrency(devis.totalTTC)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Paiement</label>
                  <Input
                    value={devis.conditionsPaiement}
                    onChange={(e) => updateDevis({ conditionsPaiement: e.target.value })}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Livraison</label>
                  <Input
                    value={devis.delaiLivraison}
                    onChange={(e) => updateDevis({ delaiLivraison: e.target.value })}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Validite (jours)</label>
                  <Input
                    type="number"
                    value={devis.validite}
                    onChange={(e) => updateDevis({ validite: parseInt(e.target.value) || 30 })}
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Share link */}
            {devis.lienPartage && (
              <Card>
                <CardHeader>
                  <CardTitle>Lien de partage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-2 bg-gray-100 rounded text-xs break-all mb-2">
                    {devis.lienPartage}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(devis.lienPartage!);
                      showToast('Lien copie !');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le lien
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Internal notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes internes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={devis.notesInternes || ''}
                  onChange={(e) => updateDevis({ notesInternes: e.target.value })}
                  placeholder="Notes visibles uniquement par l'equipe..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add product modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle>
                Ajouter {addProductType === 'emballages' ? 'un emballage' : 'un produit'}
              </CardTitle>
              <Input
                placeholder="Rechercher..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                autoFocus
              />
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {filteredProducts.slice(0, 30).map(produit => (
                <div
                  key={produit.ref}
                  className="flex items-center justify-between p-3 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => ajouterProduit(produit)}
                >
                  <div>
                    <span className="text-gray-500 text-xs font-mono mr-2">{produit.ref}</span>
                    <span className="font-medium">{produit.nom}</span>
                    <span className="text-gray-400 text-sm ml-2">({produit.sousCategorie})</span>
                  </div>
                  <span className="font-medium text-orange-600">{formatCurrency(produit.prixVenteHT)}</span>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-gray-500 py-8">Aucun produit trouve</p>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

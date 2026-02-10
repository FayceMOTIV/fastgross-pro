'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, TrendingUp, Clock, Users } from 'lucide-react';

export default function ROISection() {
  const [clients, setClients] = useState(300); // DISTRAM: ~300 restaurants
  const [tempsDevis, setTempsDevis] = useState(15);
  const [devisParJour, setDevisParJour] = useState(8); // DISTRAM: 8 commerciaux actifs

  // Calculs ROI
  const tempsGagneParDevis = tempsDevis - 0.5; // 30 secondes avec l'IA
  const tempsGagneParJour = tempsGagneParDevis * devisParJour; // en minutes
  const tempsGagneParMois = tempsGagneParJour * 22; // 22 jours ouvrés
  const heuresGagneesMois = Math.round(tempsGagneParMois / 60);

  const coutHoraireCommercial = 35; // €/heure
  const economiesMensuelle = heuresGagneesMois * coutHoraireCommercial;

  const clientsSupplementaires = Math.round(heuresGagneesMois / 2); // 2h par nouveau client
  const caMoyenClient = 1850; // €/mois
  const caSupplementaire = clientsSupplementaires * caMoyenClient;

  const roiTotal = economiesMensuelle + caSupplementaire;
  const roiMultiple = Math.round(roiTotal / 1275); // vs investissement mensuel moyen

  return (
    <section id="roi" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
            Calculateur ROI
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Calculez le ROI pour DISTRAM
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Basé sur vos 300 restaurants, 3 dépôts (Lyon, Montpellier, Bordeaux) et 8 commerciaux.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
          {/* Inputs */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-orange-600" />
              Vos données actuelles
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de clients actifs
                </label>
                <Input
                  type="number"
                  value={clients}
                  onChange={(e) => setClients(Number(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps moyen pour créer un devis (minutes)
                </label>
                <Input
                  type="number"
                  value={tempsDevis}
                  onChange={(e) => setTempsDevis(Number(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de devis créés par jour
                </label>
                <Input
                  type="number"
                  value={devisParJour}
                  onChange={(e) => setDevisParJour(Number(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Votre ROI mensuel estimé
              </h3>

              <div className="text-5xl font-bold mb-2">
                {roiTotal.toLocaleString('fr-FR')}€
              </div>
              <div className="text-orange-100">
                soit un ROI de x{roiMultiple} par rapport à l'abonnement
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-6">
                <Clock className="w-8 h-8 text-blue-600 mb-3" />
                <div className="text-2xl font-bold text-gray-900">{heuresGagneesMois}h</div>
                <div className="text-gray-600 text-sm">gagnées par mois</div>
              </div>

              <div className="bg-green-50 rounded-xl p-6">
                <Users className="w-8 h-8 text-green-600 mb-3" />
                <div className="text-2xl font-bold text-gray-900">+{clientsSupplementaires}</div>
                <div className="text-gray-600 text-sm">clients potentiels/mois</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-900 mb-3">Détail du calcul :</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex justify-between">
                  <span>Économies temps commercial</span>
                  <span className="font-medium">{economiesMensuelle.toLocaleString('fr-FR')}€</span>
                </li>
                <li className="flex justify-between">
                  <span>CA clients additionnels</span>
                  <span className="font-medium">{caSupplementaire.toLocaleString('fr-FR')}€</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                  <span>Total ROI mensuel</span>
                  <span>{roiTotal.toLocaleString('fr-FR')}€</span>
                </li>
              </ul>
            </div>

            <a href="#demo">
              <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-700">
                Obtenir ce ROI maintenant
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

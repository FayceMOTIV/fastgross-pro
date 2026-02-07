'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Route,
  MapPin,
  Clock,
  Truck,
  CheckCircle,
  Navigation,
  Sparkles,
  Loader2,
  Package
} from 'lucide-react';

interface DeliveryStop {
  position: number;
  client: string;
  adresse: string;
  heureArriveeEstimee: string;
  dureeArret: number;
  poids: number;
  status: 'pending' | 'en_route' | 'completed';
}

export default function TourneesPage() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const todayDeliveries: DeliveryStop[] = [
    { position: 1, client: "O'Tacos Lyon 7", adresse: '128 Avenue Jean Jaurès, 69007 Lyon', heureArriveeEstimee: '09:15', dureeArret: 15, poids: 85, status: 'completed' },
    { position: 2, client: 'Istanbul Kebab', adresse: '45 Rue de la République, 69002 Lyon', heureArriveeEstimee: '09:45', dureeArret: 20, poids: 120, status: 'completed' },
    { position: 3, client: 'Pizza Napoli', adresse: '67 Cours Gambetta, 69003 Lyon', heureArriveeEstimee: '10:20', dureeArret: 15, poids: 95, status: 'en_route' },
    { position: 4, client: 'Burger Factory', adresse: '23 Rue Mercière, 69002 Lyon', heureArriveeEstimee: '10:50', dureeArret: 20, poids: 110, status: 'pending' },
    { position: 5, client: 'Tacos Avenue', adresse: 'Centre Commercial Part-Dieu, 69003 Lyon', heureArriveeEstimee: '11:25', dureeArret: 25, poids: 150, status: 'pending' },
    { position: 6, client: 'La Romana', adresse: '34 Quai Saint-Antoine, 69002 Lyon', heureArriveeEstimee: '12:00', dureeArret: 15, poids: 75, status: 'pending' },
  ];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // In production, this would call the AI optimization service
    setIsOptimizing(false);
  };

  const stats = {
    totalLivraisons: todayDeliveries.length,
    completees: todayDeliveries.filter(d => d.status === 'completed').length,
    poidsTotal: todayDeliveries.reduce((sum, d) => sum + d.poids, 0),
    distanceEstimee: 28.5,
    dureeEstimee: 185,
    economie: 12,
  };

  return (
    <div className="min-h-screen">
      <Header
        title="IA Tournées"
        subtitle="Optimisez vos routes de livraison automatiquement"
      />

      <div className="p-6">
        {/* Hero */}
        <Card className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Route className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Optimisation intelligente des tournées</h2>
                <p className="text-green-100">
                  Respecte les créneaux préférentiels, optimise les distances, réduit les coûts carburant
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <Navigation className="w-5 h-5" />
                <span className="font-medium">-30% de km</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.totalLivraisons}</p>
              <p className="text-sm text-gray-500">Livraisons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completees}</p>
              <p className="text-sm text-gray-500">Terminées</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.poidsTotal} kg</p>
              <p className="text-sm text-gray-500">Poids total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.distanceEstimee} km</p>
              <p className="text-sm text-gray-500">Distance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{Math.floor(stats.dureeEstimee / 60)}h{stats.dureeEstimee % 60}</p>
              <p className="text-sm text-gray-500">Durée</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">-{stats.economie}%</p>
              <p className="text-sm text-gray-500">Économie</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Carte de la tournée
              </CardTitle>
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Optimisation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Optimiser
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Carte interactive</p>
                  <p className="text-sm">Intégration Leaflet avec tracé optimisé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route stops */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                Ordre des arrêts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayDeliveries.map((stop) => (
                <div
                  key={stop.position}
                  className={`p-3 rounded-lg border ${
                    stop.status === 'completed' ? 'bg-green-50 border-green-200' :
                    stop.status === 'en_route' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      stop.status === 'completed' ? 'bg-green-500 text-white' :
                      stop.status === 'en_route' ? 'bg-blue-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {stop.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : stop.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">{stop.client}</p>
                        <Badge variant={stop.status === 'en_route' ? 'default' : 'outline'} className="text-xs">
                          {stop.heureArriveeEstimee}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{stop.adresse}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {stop.dureeArret} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {stop.poids} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Constraints info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contraintes respectées par l'IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Créneaux par type', desc: 'Kebab 10h-11h30, Pizzeria 16h-18h...' },
                { label: 'Capacité camion', desc: '1500 kg maximum respectés' },
                { label: 'Trafic temps réel', desc: 'Évitement des zones congestionnées' },
                { label: 'Priorité clients', desc: 'Clients à risque livrés en premier' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

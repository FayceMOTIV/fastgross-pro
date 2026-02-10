'use client';

import {
  Camera,
  Target,
  Shield,
  Route,
  Package,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Camera,
    title: 'IA Scan Menu',
    subtitle: 'Flagship',
    description: 'Photographiez un menu, obtenez un devis complet en 30 secondes. Reconnaissance des plats, calcul des quantités, prix DISTRAM appliqués.',
    metrics: '30 sec → Devis complet',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
  },
  {
    icon: Target,
    title: 'IA Prospection',
    subtitle: null,
    description: 'Identifie automatiquement les restaurants à prospecter. Scoring sur 100 points, emails personnalisés générés.',
    metrics: '+15 prospects qualifiés/semaine',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'IA Détection Décrochage',
    subtitle: null,
    description: 'Détecte les clients qui vont partir 30 jours AVANT. Signaux d\'alerte, actions de rétention suggérées.',
    metrics: '-40% de clients perdus',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
  },
  {
    icon: Route,
    title: 'IA Tournées',
    subtitle: null,
    description: 'Optimise les routes sur vos 3 dépôts Lyon, Montpellier et Bordeaux. Créneaux par type de resto, trafic temps réel.',
    metrics: '-30% de kilomètres',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  {
    icon: Package,
    title: 'IA Stocks',
    subtitle: null,
    description: 'Prédit les ruptures sur vos 500 références halal. Saisonnalité Ramadan/fêtes intégrée, alertes DLC viandes.',
    metrics: '-60% de ruptures',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'IA Assistant Commercial',
    subtitle: null,
    description: 'Aide vos commerciaux sur le terrain. Cross-selling, réponses aux objections, techniques de closing.',
    metrics: '+25% de panier moyen',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-600',
  },
];

export default function Features() {
  return (
    <section id="fonctionnalites" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
            6 IAs spécialisées
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            L'intelligence artificielle au service de DISTRAM
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Chaque IA est entraînée sur les données du secteur foodservice
            et configurée avec votre catalogue produits.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 ${feature.textColor}`} />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                {feature.subtitle && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {feature.subtitle}
                  </span>
                )}
              </div>

              <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>

              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {feature.metrics}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a href="#demo">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              Demander une démo des 6 IAs
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

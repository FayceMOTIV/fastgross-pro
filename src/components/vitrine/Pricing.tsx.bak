'use client';

import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRICING_PLANS } from '@/lib/constants';

export default function Pricing() {
  return (
    <section id="tarifs" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
            Tarifs transparents
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Investissez dans votre croissance
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            ROI garanti dès le premier mois. Pas d'engagement, pas de frais cachés.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-8 border-2 transition-all ${
                plan.popular
                  ? 'border-orange-500 shadow-xl scale-105'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Recommandé
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}€</span>
                  <span className="text-gray-500">/mois</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 opacity-50">
                    <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400 line-through">{feature}</span>
                  </li>
                ))}
              </ul>

              <a href="#demo">
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                  size="lg"
                >
                  Choisir {plan.name}
                </Button>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Tous les prix sont HT. TVA applicable: 20%.
            <br />
            <span className="text-orange-600 font-medium">
              Engagement minimum: 3 mois. Puis résiliable à tout moment.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

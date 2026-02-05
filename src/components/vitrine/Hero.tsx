'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Clock, TrendingUp, Play } from 'lucide-react';

export default function Hero() {
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['30 secondes', 'une photo', 'zéro effort'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Proposition exclusive pour DISTRAM
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Créez un devis complet en{' '}
              <span className="text-orange-600 inline-block min-w-[280px]">
                {words[currentWord]}
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Photographiez le menu d'un restaurant, notre IA identifie les produits
              et génère automatiquement un devis personnalisé avec vos prix DISTRAM.
            </p>

            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-orange-600" />
                </div>
                <span>Scan intelligent</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <span>30 secondes chrono</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <span>+2h/jour gagnées</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <a href="#demo">
                <Button size="xl" className="bg-orange-600 hover:bg-orange-700 gap-2">
                  <Play className="w-5 h-5" />
                  Voir la démo en vidéo
                </Button>
              </a>
              <a href="#roi">
                <Button size="xl" variant="outline" className="gap-2">
                  Calculer mon ROI
                </Button>
              </a>
            </div>
          </div>

          {/* Right - Screenshot/Demo */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-4 border">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Camera className="w-12 h-12 text-orange-600" />
                  </div>
                  <p className="text-gray-600 font-medium">Scan Menu IA</p>
                  <p className="text-gray-400 text-sm mt-1">Photographiez, analysez, vendez</p>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
              ROI x72 minimum
            </div>
            <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Intégration SAGE incluse
            </div>

            {/* Stats floating card */}
            <div className="absolute top-1/2 -right-8 transform translate-x-1/2 bg-white rounded-xl shadow-xl p-4 border hidden xl:block">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">487</p>
                <p className="text-gray-500 text-sm">Clients actifs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

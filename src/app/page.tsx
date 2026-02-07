"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Camera,
  ShoppingCart,
  Truck,
  BarChart3,
  MessageSquare,
  Settings,
  Target,
  Shield,
  Package,
  Map,
  Check,
  ArrowRight,
  Zap,
  TrendingUp,
  Phone,
  Mail,
  Lock,
  Smartphone,
  Brain,
  Timer,
  UserPlus,
  Boxes,
  Route,
  MessageCircle,
  Store,
  CalendarCheck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Animated counter component
function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString('fr-FR')}{suffix}</span>;
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/50" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative">
                <Image
                  src="https://www.distram.com/img/ditram-logo-1648546954.jpg"
                  alt="DISTRAM"
                  width={48}
                  height={48}
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900">DISTRAM</span>
                <span className="text-xs text-slate-500 block -mt-1">L'art du Snacking depuis 1993</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#situation" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Votre situation</a>
              <a href="#scan-ia" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Scan IA</a>
              <a href="#gains" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Gains</a>
              <a href="#roi" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">ROI</a>
              <a href="#tarif" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Tarif</a>
            </div>

            <Link
              href="/app"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <span className="hidden sm:inline">Voir votre plateforme</span>
              <span className="sm:hidden">Démo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/30 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/30 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-8">
              <Target className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white font-medium">Proposition exclusive pour DISTRAM</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white">
              DISTRAM, vos 8 commerciaux méritent mieux que des{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">devis papier.</span>
            </h1>

            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              On a créé votre plateforme IA sur-mesure. <strong className="text-white">300 restaurants, 3 dépôts, 98 produits</strong> — tout est déjà configuré pour vous.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-10">
              {[
                { value: "300+", label: "Restaurants" },
                { value: "3", label: "Dépôts" },
                { value: "5", label: "IAs" },
                { value: "30s", label: "par devis" },
              ].map((stat, i) => (
                <div key={i} className="text-center px-4">
                  <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                  <p className="text-sm text-blue-200">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                Découvrir votre plateforme
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#roi"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Voir l'impact financier
                <ChevronDown className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Situation actuelle */}
      <section id="situation" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Ce que vos <span className="text-blue-600">8 commerciaux</span> vivent chaque jour
            </h2>
          </div>

          {/* Problèmes */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Timer,
                title: "Devis manuels",
                desc: "Vos commerciaux passent 1h30 par devis. Calculer les prix, vérifier le stock, recopier dans Excel...",
                stat: "3 devis/jour maximum",
                color: "red"
              },
              {
                icon: Phone,
                title: "Commandes au téléphone",
                desc: "Vos 300 restaurants appellent pour commander. Erreurs de saisie, lignes occupées, zéro commande après 18h.",
                stat: "-20% de commandes perdues",
                color: "red"
              },
              {
                icon: Route,
                title: "Tournées approximatives",
                desc: "3 dépôts, des dizaines de livraisons/jour. Itinéraires au feeling, carburant gaspillé.",
                stat: "+36K€/an de trop",
                color: "red"
              }
            ].map((item, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <item.icon className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-bold text-red-800">{item.title}</h3>
                </div>
                <p className="text-red-700/80 text-sm mb-4">{item.desc}</p>
                <p className="text-red-600 font-bold text-sm">{item.stat}</p>
              </div>
            ))}
          </div>

          {/* Flèche de transition */}
          <div className="flex justify-center my-8">
            <div className="flex items-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-red-300 to-transparent"></div>
              <ChevronDown className="h-8 w-8 text-green-500 animate-bounce" />
              <div className="h-px w-16 bg-gradient-to-l from-green-300 to-transparent"></div>
            </div>
          </div>

          {/* Solutions */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                title: "Scan Menu IA : 30 secondes",
                desc: "Photo du menu → GPT-4o analyse → devis auto avec vos 98 produits et vos prix. Le prospect n'en revient pas.",
                stat: "20 devis/jour, ×7 plus",
                color: "green"
              },
              {
                icon: ShoppingCart,
                title: "Portail B2B 24h/24",
                desc: "Vos clients commandent en ligne depuis mobile, jour et nuit. Catalogue, panier, historique. Zéro erreur.",
                stat: "+20% de commandes",
                color: "green"
              },
              {
                icon: Map,
                title: "IA Tournées optimisées",
                desc: "L'IA calcule les meilleurs itinéraires pour Lyon, Montpellier, Bordeaux. GPS temps réel, ETAs précises.",
                stat: "-30% km, -36K€/an",
                color: "green"
              }
            ].map((item, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <item.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-green-800">{item.title}</h3>
                </div>
                <p className="text-green-700/80 text-sm mb-4">{item.desc}</p>
                <p className="text-green-600 font-bold text-sm">{item.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 - Scan Menu IA */}
      <section id="scan-ia" className="py-16 md:py-24 bg-gradient-to-br from-violet-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-6">
              <Brain className="h-4 w-4 text-violet-600" />
              <span className="text-sm text-violet-700 font-semibold">Exclusivité — Aucun de vos concurrents ne l'a</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Le <span className="text-violet-600">Scan Menu IA</span>. La raison pour laquelle vos commerciaux vont vous remercier.
            </h2>
          </div>

          {/* Timeline */}
          <div className="max-w-3xl mx-auto mb-12">
            {[
              { num: 1, icon: Camera, title: "Le commercial photographie le menu", desc: "Directement depuis l'app mobile" },
              { num: 2, icon: Brain, title: "GPT-4o Vision analyse chaque plat", desc: "Détecte fromage bleu, chèvre, bacon, viande kebab..." },
              { num: 3, icon: Package, title: "Matching automatique", desc: "Avec vos 98 références DISTRAM, vrais prix grossiste, refs SAGE" },
              { num: 4, icon: Mail, title: "Devis envoyé en 1 clic", desc: "Par email ou SMS. Le prospect signe sur place." },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 mb-6 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/30">
                    {step.num}
                  </div>
                  {i < 3 && <div className="w-0.5 h-full bg-gradient-to-b from-violet-300 to-blue-300 my-2"></div>}
                </div>
                <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-1">
                    <step.icon className="h-5 w-5 text-violet-600" />
                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparaison */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
              <div className="text-center bg-red-50 rounded-xl p-6 w-full md:w-40">
                <p className="text-4xl font-black text-red-500">1h30</p>
                <p className="text-red-600/70 text-sm mt-1">Avant</p>
              </div>
              <div className="text-3xl font-bold text-slate-300">→</div>
              <div className="text-center bg-green-50 rounded-xl p-6 w-full md:w-40">
                <p className="text-4xl font-black text-green-500">30s</p>
                <p className="text-green-600/70 text-sm mt-1">Après</p>
              </div>
              <div className="text-3xl font-bold text-slate-300">=</div>
              <div className="text-center bg-violet-50 rounded-xl p-6 w-full md:w-40">
                <p className="text-4xl font-black text-violet-600">×180</p>
                <p className="text-violet-600/70 text-sm mt-1">Plus rapide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 - 7 gains concrets */}
      <section id="gains" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              <span className="text-blue-600">7 impacts</span> mesurables sur votre activité
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Timer,
                title: "Temps gagné",
                color: "blue",
                stats: [
                  { label: "×180 plus rapide", desc: "pour un devis" },
                  { label: "×7 devis/commercial", desc: "par jour (3 → 20)" },
                  { label: "×2.5 prospects visités", desc: "par jour (4 → 10)" },
                ],
                footer: "Vos 8 commerciaux récupèrent 12h/jour au total"
              },
              {
                icon: UserPlus,
                title: "Nouveaux clients",
                color: "green",
                stats: [
                  { label: "+15 clients/mois", desc: "grâce à la rapidité" },
                  { label: "15% → 35%", desc: "conversion prospects (+133%)" },
                ],
                footer: "CA additionnel : +540K€/an"
              },
              {
                icon: Shield,
                title: "Clients existants suivis par IA",
                color: "violet",
                stats: [
                  { label: "-60% churn", desc: "IA Anti-Churn" },
                  { label: "30 clients sauvés", desc: "+1,08M€/an préservé" },
                  { label: "+12% panier moyen", desc: "cross-sell IA" },
                ],
                footer: "+280K€/an supplémentaires"
              },
              {
                icon: Boxes,
                title: "Gestion des stocks intelligente",
                color: "amber",
                stats: [
                  { label: "-85% ruptures", desc: "IA prédictive 2 semaines" },
                  { label: "Ramadan, Aïd, été", desc: "saisonnalité intégrée" },
                  { label: "-40% gaspillage", desc: "alertes DLC viandes" },
                ],
                footer: "Jamais en rupture, jamais de perte"
              },
              {
                icon: Truck,
                title: "Livraisons optimisées",
                color: "emerald",
                stats: [
                  { label: "-30% kilomètres", desc: "IA Tournées 3 dépôts" },
                  { label: "-36K€/an", desc: "économie carburant" },
                  { label: "95% à l'heure", desc: "vs 75% avant" },
                ],
                footer: "GPS temps réel intégré"
              },
              {
                icon: MessageCircle,
                title: "Messagerie sécurisée",
                color: "pink",
                stats: [
                  { label: "Fini WhatsApp", desc: "pour les prix et remises" },
                  { label: "100% traçable", desc: "historique horodaté" },
                ],
                footer: "Quand un commercial part, rien ne se perd"
              },
              {
                icon: Store,
                title: "Portail B2B 24h/24",
                color: "orange",
                stats: [
                  { label: "+20% commandes", desc: "jour et nuit" },
                  { label: "98 produits", desc: "catalogue avec vos prix" },
                  { label: "Zéro erreur", desc: "zéro appel téléphonique" },
                ],
                footer: "Vos restaurants commandent depuis mobile"
              },
            ].map((card, i) => {
              const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", icon: "bg-blue-100" },
                green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", icon: "bg-green-100" },
                violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-600", icon: "bg-violet-100" },
                amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", icon: "bg-amber-100" },
                emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", icon: "bg-emerald-100" },
                pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600", icon: "bg-pink-100" },
                orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", icon: "bg-orange-100" },
              };
              const colors = colorClasses[card.color];

              return (
                <div key={i} className={cn("rounded-2xl p-6 border", colors.bg, colors.border)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-3 rounded-xl", colors.icon)}>
                      <card.icon className={cn("h-6 w-6", colors.text)} />
                    </div>
                    <h3 className="font-bold text-slate-900">{card.title}</h3>
                  </div>
                  <div className="space-y-2 mb-4">
                    {card.stats.map((stat, j) => (
                      <div key={j} className="flex items-baseline gap-2">
                        <span className={cn("font-bold", colors.text)}>{stat.label}</span>
                        <span className="text-sm text-slate-500">{stat.desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 pt-3 border-t border-slate-200">{card.footer}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6 - ROI */}
      <section id="roi" className="py-16 md:py-24 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-2">
              L'impact financier pour <span className="text-green-600">DISTRAM</span>
            </h2>
            <p className="text-slate-600">Basé sur vos 300 restaurants, 3 dépôts et 8 commerciaux</p>
          </div>

          {/* Big number */}
          <div className="text-center mb-12">
            <p className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">
              +<AnimatedCounter value={1960000} suffix="€" />/an
            </p>
            <p className="text-slate-600 mt-2">d'impact total estimé</p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: UserPlus, value: "+540K€", label: "Nouveaux clients", desc: "+15/mois × 3K€" },
              { icon: Shield, value: "+1,08M€", label: "Clients sauvés", desc: "30 clients × 36K€" },
              { icon: TrendingUp, value: "+280K€", label: "Panier optimisé", desc: "+12% cross-sell" },
              { icon: Truck, value: "+61K€", label: "Économies logistique", desc: "Carburant + stocks" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-lg border border-green-100">
                <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto mb-3">
                  <item.icon className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-3xl font-black text-green-600 mb-1">{item.value}</p>
                <p className="font-semibold text-slate-900 mb-1">{item.label}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom metrics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200 max-w-3xl mx-auto">
            <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
              <div className="px-4">
                <p className="text-2xl font-black text-slate-900">15 288€/an</p>
                <p className="text-sm text-slate-500">Coût total</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-black text-green-600">×128</p>
                <p className="text-sm text-slate-500">ROI</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-black text-blue-600">&lt; 1 semaine</p>
                <p className="text-sm text-slate-500">Rentabilisé</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 - 5 IAs */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-violet-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              <span className="text-blue-600">5 intelligences artificielles</span> conçues pour DISTRAM
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Camera, name: "Scan Menu", desc: "Analyse menus par photo, devis 30s avec vos 98 produits", impact: "×180 plus rapide" },
              { icon: Target, name: "Prospection", desc: "Détecte nouveaux restaurants Lyon/Montpellier/Bordeaux", impact: "+15 clients/mois" },
              { icon: Shield, name: "Anti-Churn", desc: "Analyse baisses de commandes, alerte avant départ client", impact: "-60% de perte" },
              { icon: Boxes, name: "Stocks Prédictive", desc: "Anticipe ruptures, saisonnalité Ramadan/Aïd, alertes DLC", impact: "-85% ruptures" },
              { icon: Route, name: "Tournées", desc: "Optimise routes 3 dépôts, réduit km et carburant", impact: "-36K€/an" },
              { icon: MessageSquare, name: "Assistant Commercial", desc: "Aide terrain : objections, cross-sell, arguments personnalisés", impact: "+15% panier" },
            ].map((ai, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl">
                    <ai.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900">{ai.name}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-3">{ai.desc}</p>
                <p className="text-blue-600 font-bold text-sm">{ai.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 - 6 modules */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              6 modules. Un seul outil. <span className="text-blue-600">Tout est prêt.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, name: "Mode Commercial", desc: "CRM, scan menu IA, devis", href: "/commercial", stat: "+133% conversion", color: "from-blue-500 to-indigo-600" },
              { icon: ShoppingCart, name: "Portail Client B2B", desc: "Commandes 24/7, catalogue", href: "/portail", stat: "+20% commandes", color: "from-orange-500 to-amber-600" },
              { icon: Truck, name: "Mode Livreur", desc: "Tournées, GPS, validation", href: "/livreur", stat: "-30% km", color: "from-emerald-500 to-teal-600" },
              { icon: BarChart3, name: "Mode Manager", desc: "Multi-dépôts, KPIs", href: "/supervision", stat: "Temps réel", color: "from-violet-500 to-purple-600" },
              { icon: MessageSquare, name: "Messagerie", desc: "Canal pro sécurisé", href: "/chat", stat: "100% traçable", color: "from-pink-500 to-rose-600" },
              { icon: Settings, name: "Admin", desc: "Users, catalogue, intégrations", href: "/settings", stat: "SAGE ready", color: "from-slate-500 to-slate-700" },
            ].map((module, i) => (
              <Link
                key={i}
                href={module.href}
                className="group bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", module.color)}>
                  <module.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{module.name}</h3>
                <p className="text-slate-500 text-sm mb-3">{module.desc}</p>
                <p className="text-green-600 text-sm font-semibold">{module.stat}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9 - Sécurité */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: "Données protégées", desc: "Firebase Google Cloud, 99.95% dispo, serveurs Europe" },
              { icon: Zap, title: "Compatible SAGE", desc: "Refs SAGE, export, sync prête à activer" },
              { icon: Smartphone, title: "Multi-support", desc: "PC manager, tablette commercial, mobile livreur" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="p-3 bg-slate-100 rounded-xl w-fit mb-4">
                  <item.icon className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 10 - Tarif */}
      <section id="tarif" className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-200 rounded-full mb-6">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-semibold">Offre Premier Partenaire — Unique & Non Reproductible</span>
            </div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              DISTRAM est notre premier partenaire officiel. À ce titre, vous bénéficiez d'un tarif de lancement que nous ne pourrons plus jamais proposer.
            </p>
          </div>

          {/* Pricing card */}
          <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-3xl p-1">
            <div className="bg-white rounded-[22px] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Pack Enterprise Complet — DISTRAM</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-slate-500">Setup :</span>
                  <span className="text-3xl font-black text-slate-900">9 900€</span>
                  <span className="text-slate-500">HT</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">Formation 8 commerciaux + config 3 dépôts + import 98 produits + personnalisation</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-slate-500">puis</span>
                  <span className="text-4xl font-black text-blue-600">449€</span>
                  <span className="text-slate-500">/mois HT</span>
                </div>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {[
                  "Mode Commercial + CRM",
                  "Scan Menu IA (GPT-4o)",
                  "Portail Client B2B 24/7",
                  "Mode Livreur + GPS",
                  "Mode Manager 3 dépôts",
                  "5 IAs embarquées",
                  "Messagerie sécurisée",
                  "Analytics & rapports",
                  "Email + SMS",
                  "Paiement Stripe",
                  "Compatible SAGE",
                  "Support prioritaire",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* ROI reminder */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
                <p className="text-green-800">
                  <span className="font-bold">Pour 449€/mois</span> → <span className="font-black text-green-600">+163K€/mois</span> de CA additionnel. <span className="font-bold">ROI ×128.</span>
                </p>
              </div>

              {/* CTA */}
              <Link
                href="/app"
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                Découvrir votre plateforme
                <ArrowRight className="h-5 w-5" />
              </Link>

              {/* Trust badges */}
              <p className="text-center text-sm text-slate-500 mt-4">
                Paiement en 3× sans frais • 14j essai • Satisfait ou remboursé 30j
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 11 - CTA Final */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-900 via-blue-700 to-violet-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Votre plateforme est prête, Hamza.
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            300 restaurants, 3 dépôts, 98 produits — tout est configuré.<br />
            Il ne manque plus que votre signature.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@facemedia.fr?subject=RDV DISTRAM - Plateforme IA"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-blue-700 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <CalendarCheck className="h-5 w-5" />
              Planifier notre rendez-vous
            </a>
            <Link
              href="/app"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Explorer votre plateforme
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm">
            <span className="font-semibold text-white">DISTRAM</span> × <span className="text-slate-500">FACE MEDIA</span> — Votre plateforme IA sur-mesure
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Powered by Face Media • © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

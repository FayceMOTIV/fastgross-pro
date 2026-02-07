"use client";

import Link from "next/link";
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
  Sparkles,
  Clock,
  Users,
  Euro,
  Check,
  ArrowRight,
  Zap,
  TrendingUp,
  Phone,
  Mail,
  ChevronRight,
  Star,
  Lock,
  Cloud,
  Smartphone,
  FileText,
  Building2,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
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

  return (
    <span>
      {count.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans antialiased">
      {/* SECTION 1 - Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                FACE MEDIA
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#probleme" className="text-sm text-white/70 hover:text-white transition-colors">
                Problème
              </a>
              <a href="#scan-ia" className="text-sm text-white/70 hover:text-white transition-colors">
                Scan IA
              </a>
              <a href="#modules" className="text-sm text-white/70 hover:text-white transition-colors">
                Modules
              </a>
              <a href="#roi" className="text-sm text-white/70 hover:text-white transition-colors">
                ROI
              </a>
              <a href="#ia" className="text-sm text-white/70 hover:text-white transition-colors">
                IA
              </a>
              <a href="#tarifs" className="text-sm text-white/70 hover:text-white transition-colors">
                Tarifs
              </a>
            </div>

            <Link
              href="/app"
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
            >
              Voir la démo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* SECTION 2 - Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[150px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-white/80">Conçu pour les grossistes alimentaires halal</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
            Vos commerciaux perdent{" "}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              12 heures par jour.
            </span>
            <br />
            On change ça.
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-10">
            La première plateforme IA qui transforme vos commerciaux terrain en machines à signer.
            Devis en 30 secondes, commandes B2B 24h/24, tournées optimisées.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@facemedia.fr?subject=Demande de démo FACE MEDIA GROSSISTE"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              <Mail className="h-5 w-5" />
              Réserver ma démo personnalisée
            </a>
            <a
              href="#roi"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-5 w-5" />
              Voir le ROI pour mon entreprise
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 3 - Social Proof Bar */}
      <section className="py-8 border-y border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            {[
              { value: 300, suffix: "+", label: "Restaurants gérés" },
              { value: 98, suffix: "", label: "Produits catalogue" },
              { value: 5, suffix: "", label: "IAs spécialisées" },
              { value: 30, suffix: "s", label: "Pour un devis" },
              { value: 128, suffix: "×", label: "ROI moyen" },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl md:text-4xl font-black text-white font-mono">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 - Problem / Solution */}
      <section id="probleme" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Le problème que{" "}
              <span className="text-red-500">personne ne résout</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Pendant que vos concurrents s'adaptent, vous perdez du terrain. Voici ce que ça vous coûte.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                problem: "Devis manuels interminables",
                problemMetric: "1h30/devis, 3/jour max",
                solution: "Scan Menu IA : 30 secondes",
                solutionMetric: "30s, 20 devis/jour",
                icon: Clock,
              },
              {
                problem: "Commandes par téléphone",
                problemMetric: "-20% commandes perdues",
                solution: "Portail B2B 24h/24",
                solutionMetric: "+20% commandes",
                icon: Phone,
              },
              {
                problem: "Tournées non optimisées",
                problemMetric: "+36K€/an carburant gaspillé",
                solution: "IA Tournées routes optimisées",
                solutionMetric: "-30% km, -36K€/an",
                icon: Map,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <item.icon className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-400">{item.problem}</p>
                    <p className="text-sm text-red-400/60">{item.problemMetric}</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-red-500/50 via-white/20 to-green-500/50 my-4" />
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-400">{item.solution}</p>
                    <p className="text-sm text-green-400/60">{item.solutionMetric}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 - Killer Feature: Scan Menu IA */}
      <section id="scan-ia" className="py-20 md:py-32 bg-gradient-to-b from-orange-500/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-400 font-semibold">
                Exclusivité FACE MEDIA — Aucun concurrent ne l'a
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Le <span className="text-orange-500">Scan Menu IA</span>. La feature qui change tout.
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Prenez en photo le menu d'un restaurant. Notre IA GPT-4o analyse les plats,
              matche avec votre catalogue, et génère un devis complet en 30 secondes.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { step: "1", title: "Photo", desc: "Prenez le menu en photo", icon: Camera },
              { step: "2", title: "Analyse", desc: "GPT-4o détecte les plats", icon: Sparkles },
              { step: "3", title: "Matching", desc: "Produits du catalogue 98 items", icon: Package },
              { step: "4", title: "Devis", desc: "Envoyé par email en 1 clic", icon: FileText },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {item.step}
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-xl w-fit mx-auto mb-3">
                    <item.icon className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </div>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-3 text-orange-500/50" />
                )}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-red-500/10 to-green-500/10 border border-white/10 rounded-2xl p-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-5xl font-black text-red-500">1h30</p>
                <p className="text-white/50">Méthode classique</p>
              </div>
              <div className="text-4xl font-bold text-white/30">→</div>
              <div className="text-center">
                <p className="text-5xl font-black text-green-500">30s</p>
                <p className="text-white/50">Avec Scan Menu IA</p>
              </div>
              <div className="text-4xl font-bold text-white/30">=</div>
              <div className="text-center">
                <p className="text-5xl font-black text-orange-500">×180</p>
                <p className="text-white/50">Plus rapide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 - Les 6 Modules */}
      <section id="modules" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              6 modules. <span className="text-orange-500">Une seule plateforme.</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Chaque métier a son espace optimisé. Commercial, client, livreur, manager — tout le monde y gagne.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                name: "Mode Commercial",
                desc: "CRM, prospects, scan menu IA, devis, pipeline",
                stats: "+133% conversion, ×7 devis/jour",
                color: "from-blue-500 to-indigo-600",
                href: "/commercial",
              },
              {
                icon: ShoppingCart,
                name: "Portail Client B2B",
                desc: "Commandes 24/7, catalogue 98 produits, panier, factures",
                stats: "+20% commandes, 0 erreur",
                color: "from-orange-500 to-amber-600",
                href: "/portail",
              },
              {
                icon: Truck,
                name: "Mode Livreur",
                desc: "Tournées IA, GPS temps réel, validation livraison",
                stats: "-30% km, 95% à l'heure",
                color: "from-emerald-500 to-teal-600",
                href: "/livreur",
              },
              {
                icon: BarChart3,
                name: "Mode Manager",
                desc: "Multi-dépôts Lyon/Montpellier/Bordeaux, KPIs, alertes",
                stats: "3 dépôts, temps réel",
                color: "from-violet-500 to-purple-600",
                href: "/supervision",
              },
              {
                icon: MessageSquare,
                name: "Messagerie Sécurisée",
                desc: "Canal pro chiffré, traçable, historique complet",
                stats: "100% traçable, chiffré",
                color: "from-pink-500 to-rose-600",
                href: "/chat",
              },
              {
                icon: Settings,
                name: "Mode Admin",
                desc: "Users, catalogue, intégrations SAGE/SendGrid/Twilio/Stripe",
                stats: "SAGE ready, multi-rôles",
                color: "from-slate-500 to-slate-700",
                href: "/settings",
              },
            ].map((module, i) => (
              <Link
                key={i}
                href={module.href}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-orange-500/30 transition-all"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                    module.color
                  )}
                >
                  <module.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">
                  {module.name}
                </h3>
                <p className="text-white/50 text-sm mb-3">{module.desc}</p>
                <p className="text-green-400 text-sm font-semibold">{module.stats}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 - ROI */}
      <section id="roi" className="py-20 md:py-32 bg-gradient-to-br from-green-500/10 via-orange-500/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              L'impact financier est{" "}
              <span className="text-green-500">mathématiquement prouvé.</span>
            </h2>
            <p className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 my-8">
              +1,96M€
            </p>
            <p className="text-white/60">d'impact annuel estimé</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Users, value: "+540K€", label: "Nouveaux clients", desc: "+15/mois × 3K€" },
              { icon: Shield, value: "+1,08M€", label: "Clients sauvés par l'IA", desc: "30 × 36K€/an" },
              { icon: TrendingUp, value: "+280K€", label: "Optimisation panier", desc: "+12% panier moyen" },
              { icon: Truck, value: "+61K€", label: "Économies logistique", desc: "-30% km parcourus" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
              >
                <div className="p-3 bg-green-500/10 rounded-xl w-fit mx-auto mb-3">
                  <item.icon className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-3xl font-black text-green-400 mb-1">{item.value}</p>
                <p className="font-semibold mb-1">{item.label}</p>
                <p className="text-sm text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div>
                <p className="text-white/50 mb-1">Coût annuel</p>
                <p className="text-2xl font-bold">15 288€/an</p>
              </div>
              <div className="text-4xl">÷</div>
              <div>
                <p className="text-white/50 mb-1">Impact annuel</p>
                <p className="text-2xl font-bold text-green-400">1 960 000€</p>
              </div>
              <div className="text-4xl">=</div>
              <div>
                <p className="text-white/50 mb-1">ROI</p>
                <p className="text-4xl font-black text-orange-500">×128</p>
              </div>
            </div>
            <p className="mt-6 text-green-400 font-semibold">
              Rentabilisé en moins d'une semaine
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8 - Les 5 IAs */}
      <section id="ia" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              5 IAs spécialisées.{" "}
              <span className="text-orange-500">Zéro effort.</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Chaque IA travaille 24h/24 pour vous. Prospection, anti-churn, stocks, tournées, assistance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                name: "Scan Menu",
                desc: "Analyse menus par photo, devis en 30s",
                impact: "×180 plus rapide",
              },
              {
                icon: Target,
                name: "Prospection IA",
                desc: "Détecte nouveaux restaurants automatiquement",
                impact: "+15 clients/mois",
              },
              {
                icon: Shield,
                name: "Anti-Churn IA",
                desc: "Détecte baisses commandes avant départ",
                impact: "-60% perte clients",
              },
              {
                icon: Package,
                name: "Stocks Prédictive",
                desc: "Prédit ruptures 2 semaines avant, Ramadan",
                impact: "-85% ruptures",
              },
              {
                icon: Map,
                name: "Tournées IA",
                desc: "Itinéraires optimaux pour 3 dépôts",
                impact: "-36K€/an carburant",
              },
              {
                icon: MessageSquare,
                name: "Assistant Commercial",
                desc: "Objections, cross-sell, arguments personnalisés",
                impact: "+15% panier moyen",
              },
            ].map((ia, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-all"
              >
                <div className="p-3 bg-orange-500/10 rounded-xl w-fit mb-4">
                  <ia.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{ia.name}</h3>
                <p className="text-white/50 text-sm mb-3">{ia.desc}</p>
                <p className="text-green-400 font-semibold">{ia.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9 - Sécurité & Infrastructure */}
      <section className="py-20 md:py-32 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Sécurité & Infrastructure{" "}
              <span className="text-orange-500">entreprise</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: "Messagerie chiffrée", desc: "Fini WhatsApp pour les prix" },
              { icon: Lock, title: "Authentification sécurisée", desc: "Rôles par métier" },
              { icon: FileText, title: "Traçabilité complète", desc: "Chaque action horodatée" },
              { icon: Cloud, title: "Google Cloud Platform", desc: "99,95% disponibilité" },
              { icon: Zap, title: "Compatible SAGE", desc: "Références, export, sync" },
              { icon: Smartphone, title: "Multi-support", desc: "PC, tablette, mobile" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <item.icon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10 - Tarifs */}
      <section id="tarifs" className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-6">
              <Award className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-400 font-semibold">Offre de lancement</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Pack Enterprise Complet
            </h2>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-orange-500/30 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-white/50 mb-2">Setup unique</p>
                <p className="text-4xl font-black">
                  9 900€ <span className="text-lg font-normal text-white/50">HT</span>
                </p>
                <p className="text-sm text-white/40 mt-1">Formation + config + import + personnalisation</p>
              </div>
              <div>
                <p className="text-white/50 mb-2">Abonnement mensuel</p>
                <p className="text-4xl font-black text-orange-500">
                  449€ <span className="text-lg font-normal text-white/50">HT/mois</span>
                </p>
                <p className="text-sm text-white/40 mt-1">Tout inclus, sans limite d'utilisateurs</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                "6 modules métiers complets",
                "5 IAs spécialisées",
                "Catalogue 98 produits",
                "3 dépôts inclus (Lyon, Montpellier, Bordeaux)",
                "Messagerie chiffrée",
                "Support prioritaire",
                "Formation équipe complète",
                "Intégration SAGE",
                "Export PDF/Excel",
                "API disponible",
                "Mises à jour incluses",
                "Hébergement sécurisé France",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-white/80 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center mb-8">
              <p className="text-white/80 mb-2">
                Pour <span className="text-orange-500 font-bold">449€/mois</span>, vous générez{" "}
                <span className="text-green-400 font-bold">+163K€/mois</span>.
              </p>
              <p className="text-3xl font-black text-green-400">ROI ×128</p>
            </div>

            <div className="text-center">
              <a
                href="mailto:contact@facemedia.fr?subject=Demande de démo FACE MEDIA GROSSISTE"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25"
              >
                <Mail className="h-5 w-5" />
                Réserver ma démo personnalisée
              </a>
              <p className="text-white/40 text-sm mt-4">
                Paiement en 3× disponible • 14 jours d'essai • Satisfait ou remboursé 30 jours
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11 - CTA Final */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-orange-500/10 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Prêt à transformer votre activité ?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Réservez une démo de 30 minutes avec notre équipe.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@facemedia.fr?subject=Demande de démo FACE MEDIA GROSSISTE"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              <Mail className="h-5 w-5" />
              Demander une démo
            </a>
            <Link
              href="/app"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              Voir l'application
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 12 - Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">FACE MEDIA GROSSISTE</span>
            </div>
            <p className="text-white/40 text-sm">
              La plateforme IA des grossistes alimentaires
            </p>
            <p className="text-white/40 text-sm">
              © 2026 Face Media • SASU • Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

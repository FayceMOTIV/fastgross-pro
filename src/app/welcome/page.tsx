"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Users,
  BarChart3,
  Package,
  MapPin,
  Sparkles,
  Menu,
  X,
  Camera,
  Target,
  Mail,
  Globe,
  Bot,
  Scan,
  Search,
  ShoppingCart,
  Award,
  Phone,
  ChevronDown,
  CheckCircle2,
  PlayCircle,
  MessageSquare,
  Hash,
  Lock,
  Bell,
  Paperclip,
  Send,
  Download,
  Zap,
  Eye,
  RefreshCw,
  Building2,
  FileText,
  MailOpen,
  Reply,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Counter hook for animations
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, started]);

  return { count, start: () => setStarted(true) };
}

export default function WelcomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const counter1 = useCounter(35);
  const counter2 = useCounter(98);
  const counter3 = useCounter(150);
  const counter4 = useCounter(2);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const statsSection = document.getElementById("stats-section");
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8) {
          counter1.start();
          counter2.start();
          counter3.start();
          counter4.start();
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [counter1, counter2, counter3, counter4]);

  // Auto-advance sourcing steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const allFeatures = [
    { icon: Scan, title: "Scan IA Menus", desc: "Devis automatiques depuis les menus" },
    { icon: Search, title: "Sourcing IA", desc: "Prospects depuis Google Maps" },
    { icon: Mail, title: "Email Automation", desc: "Séquences personnalisées IA" },
    { icon: MapPin, title: "GPS Tracking", desc: "Livreurs en temps réel" },
    { icon: MessageSquare, title: "Chat Sécurisé", desc: "Communication équipe Slack-like" },
    { icon: ShoppingCart, title: "Gestion Commandes", desc: "Pipeline complet de A à Z" },
    { icon: Users, title: "CRM Intégré", desc: "Historique clients complet" },
    { icon: Package, title: "Catalogue Produits", desc: "Stocks et prix centralisés" },
    { icon: Truck, title: "Module Livreur", desc: "App mobile dédiée" },
    { icon: Globe, title: "Portail Client B2B", desc: "Commandes en libre-service" },
    { icon: BarChart3, title: "Analytics Avancés", desc: "Tableaux de bord temps réel" },
    { icon: Award, title: "Gamification", desc: "Leaderboard commerciaux" },
  ];


  const faqs = [
    {
      question: "Comment fonctionne la génération de prospects ?",
      answer: "Notre IA scrape automatiquement Google Maps et les annuaires professionnels pour trouver tous les restaurants, hôtels, et commerces alimentaires de votre zone. Chaque prospect est enrichi avec email, téléphone, site web, avis Google, et reçoit un score de qualité basé sur son potentiel. Vous pouvez ensuite les exporter ou les ajouter directement à votre CRM.",
    },
    {
      question: "La messagerie est-elle vraiment sécurisée ?",
      answer: "Oui, toutes les communications sont chiffrées de bout en bout. Contrairement à WhatsApp, les données restent sur nos serveurs sécurisés en Europe. Vous gardez le contrôle total : historique des conversations, gestion des accès par rôle, et conformité RGPD garantie.",
    },
    {
      question: "Comment fonctionne le Scan IA de menus ?",
      answer: "Prenez simplement une photo du menu avec l'application. Notre IA utilise la reconnaissance optique (OCR) et le machine learning pour identifier les plats, extraire les ingrédients, et matcher automatiquement avec votre catalogue produits. Un devis est généré en moins de 30 secondes.",
    },
    {
      question: "Le sourcing IA est-il légal ?",
      answer: "Oui, nous scrapons uniquement les données publiques disponibles sur Google Maps et les annuaires professionnels. Les données collectées (nom, adresse, téléphone publié) sont des informations professionnelles accessibles à tous. Nous respectons le RGPD.",
    },
    {
      question: "Puis-je importer mes clients existants ?",
      answer: "Absolument ! Vous pouvez importer vos données via CSV ou Excel. Notre équipe peut également vous accompagner pour une migration complète depuis votre ancien système (ERP, Excel, etc.).",
    },
    {
      question: "Y a-t-il une application mobile pour les livreurs ?",
      answer: "Oui, DISTRAM inclut une application mobile dédiée aux livreurs. Ils peuvent voir leurs tournées, naviguer vers les clients, scanner les bons de livraison, et mettre à jour les statuts en temps réel.",
    },
  ];

  // Sourcing steps for visual demo
  const sourcingSteps = [
    {
      step: 1,
      title: "Définissez votre zone",
      desc: "Ville, rayon, type d'établissement",
      icon: MapPin,
      visual: (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm">Lyon</div>
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm">20km</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Restaurants", "Hôtels", "Boulangeries"].map((t) => (
              <span key={t} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{t}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      step: 2,
      title: "L'IA scrape Google Maps",
      desc: "Extraction automatique des données",
      icon: Search,
      visual: (
        <div className="bg-slate-900 rounded-xl p-4 text-green-400 font-mono text-xs">
          <div className="animate-pulse">
            <p>{">"} Scanning Google Maps...</p>
            <p>{">"} Found 847 restaurants</p>
            <p>{">"} Extracting data...</p>
            <p className="text-emerald-400">{">"} 234 new prospects found ✓</p>
          </div>
        </div>
      ),
    },
    {
      step: 3,
      title: "Enrichissement automatique",
      desc: "Email, téléphone, site web, avis",
      icon: Zap,
      visual: (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-slate-200 space-y-2">
          {[
            { label: "Email", value: "contact@resto.fr", color: "emerald" },
            { label: "Tél", value: "02 97 XX XX XX", color: "blue" },
            { label: "Avis", value: "4.5★ (127)", color: "amber" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{item.label}</span>
              <span className={`px-2 py-0.5 bg-${item.color}-100 text-${item.color}-700 rounded text-xs`}>{item.value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      step: 4,
      title: "Score de qualité IA",
      desc: "Priorisation intelligente",
      icon: Target,
      visual: (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Le Bistrot Gourmet</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">92%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-[92%] bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Fort potentiel • Email vérifié • Bon CA estimé</p>
        </div>
      ),
    },
    {
      step: 5,
      title: "Export ou CRM",
      desc: "CSV, Excel, ou ajout direct",
      icon: Download,
      visual: (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
              <Download className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <span className="text-xs text-blue-700">Export CSV</span>
            </button>
            <button className="p-3 bg-violet-50 hover:bg-violet-100 rounded-lg text-center transition-colors">
              <Users className="h-5 w-5 mx-auto mb-1 text-violet-600" />
              <span className="text-xs text-violet-700">Ajouter CRM</span>
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-200" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/welcome" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-violet-500/30">
                D
              </div>
              <div>
                <span className="text-xl font-black tracking-tight">DISTRAM</span>
                <span className="block text-[10px] text-slate-500 font-medium -mt-0.5">by Face Media</span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              <a href="#sourcing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sourcing IA</a>
              <a href="#messaging" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Messagerie</a>
              <a href="#scan" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Scan IA</a>
              <a href="#automation" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Automation</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Connexion
              </Link>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
              >
                Essai gratuit
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              <a href="#sourcing" className="block text-lg font-medium">Sourcing IA</a>
              <a href="#messaging" className="block text-lg font-medium">Messagerie</a>
              <a href="#scan" className="block text-lg font-medium">Scan IA</a>
              <a href="#automation" className="block text-lg font-medium">Automation</a>
              <div className="pt-4 flex flex-col gap-3">
                <Link href="/login" className="w-full py-3 text-center border border-slate-200 rounded-xl font-medium">Connexion</Link>
                <Link href="/login" className="w-full py-3 text-center bg-violet-600 text-white rounded-xl font-semibold">Essai gratuit</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 to-white" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-violet-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">La plateforme n°1 pour les grossistes alimentaires</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
              Trouvez des prospects,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">
                automatisez tout le reste
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              <strong>DISTRAM</strong> génère vos prospects avec l&apos;IA, automatise vos emails de prospection,
              et centralise la communication de votre équipe. Tout-en-un.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/login"
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-lg font-semibold rounded-xl transition-all shadow-xl shadow-violet-500/30 w-full sm:w-auto"
              >
                Démarrer gratuitement
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="group flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-lg font-medium rounded-xl transition-all w-full sm:w-auto">
                <PlayCircle className="h-6 w-6 text-violet-600" />
                Voir la démo (2 min)
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>Essai 14 jours gratuit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>Sans carte bancaire</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: counter1.count, suffix: "%", label: "de temps gagné", sublabel: "sur la prospection" },
              { value: counter2.count, suffix: "%", label: "de satisfaction", sublabel: "clients" },
              { value: counter3.count, suffix: "K", label: "prospects générés", sublabel: "par mois" },
              { value: counter4.count, suffix: "x", label: "plus de conversions", sublabel: "grâce à l'automation" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl lg:text-5xl font-black text-white">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-lg font-medium text-white mt-1">{stat.label}</p>
                <p className="text-sm text-slate-400">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURE 1: SOURCING IA - GÉNÉRATION PROSPECTS */}
      {/* ============================================ */}
      <section id="sourcing" className="py-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full mb-4">
              <Search className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Génération de Prospects IA</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Trouvez <span className="text-blue-600">200+ prospects</span> par semaine
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Notre IA scrape Google Maps et enrichit automatiquement chaque prospect.
              Fini les heures perdues à chercher des clients manuellement.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Steps */}
            <div className="space-y-4">
              {sourcingSteps.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                    activeStep === i
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "bg-white border border-slate-200 hover:border-blue-300"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold",
                    activeStep === i ? "bg-white/20" : "bg-blue-100"
                  )}>
                    <item.icon className={cn("h-6 w-6", activeStep === i ? "text-white" : "text-blue-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        activeStep === i ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                      )}>
                        Étape {item.step}
                      </span>
                    </div>
                    <p className={cn("font-semibold mt-1", activeStep === i ? "text-white" : "text-slate-900")}>
                      {item.title}
                    </p>
                    <p className={cn("text-sm", activeStep === i ? "text-blue-100" : "text-slate-500")}>
                      {item.desc}
                    </p>
                  </div>
                  {activeStep === i && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Right: Visual Demo */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-100 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
                <div className="w-full max-w-xs transform transition-all duration-500">
                  {sourcingSteps[activeStep].visual}
                </div>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-4 left-8 right-8">
                <div className="flex gap-2">
                  {sourcingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i === activeStep ? "bg-blue-600" : "bg-slate-300"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/prospects/sourcing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Essayer le Sourcing IA
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURE 2: MESSAGERIE SÉCURISÉE */}
      {/* ============================================ */}
      <section id="messaging" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full mb-4">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Messagerie d&apos;Équipe Sécurisée</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-4">
              Remplacez WhatsApp par une solution <span className="text-emerald-400">professionnelle</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Communication centralisée, chiffrée, et intégrée à vos opérations.
              Fini les groupes WhatsApp qui débordent.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Chat Demo */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-lg">
                      <Hash className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">commerciaux</span>
                    </div>
                    <span className="text-xs text-slate-500">8 membres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      <Bell className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      <Lock className="h-4 w-4 text-emerald-400" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-4 h-80 overflow-y-auto">
                  {[
                    { user: "Sophie M.", avatar: "SM", color: "from-violet-500 to-purple-600", time: "09:34", msg: "J'ai décroché le contrat avec Le Gourmet ! 🎉", isMe: false },
                    { user: "Karim M.", avatar: "KM", color: "from-blue-500 to-cyan-600", time: "09:35", msg: "Bravo Sophie ! C'est le restaurant qu'on avait trouvé avec le sourcing IA ?", isMe: false },
                    { user: "Sophie M.", avatar: "SM", color: "from-violet-500 to-purple-600", time: "09:36", msg: "Exactement ! Score de 94%, email vérifié. Le rdv s'est super bien passé.", isMe: false },
                    { user: "Vous", avatar: "FM", color: "from-emerald-500 to-teal-600", time: "09:38", msg: "Super travail ! J'assigne la livraison à Ahmed. @Ahmed tu peux passer demain 9h ?", isMe: true },
                    { user: "Ahmed K.", avatar: "AK", color: "from-amber-500 to-orange-600", time: "09:40", msg: "Parfait, c'est noté ! J'ai vu l'adresse sur le tracking 👍", isMe: false },
                  ].map((message, i) => (
                    <div key={i} className={cn("flex gap-3", message.isMe && "flex-row-reverse")}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-gradient-to-br", message.color)}>
                        {message.avatar}
                      </div>
                      <div className={cn("max-w-[70%]", message.isMe && "text-right")}>
                        <div className={cn("flex items-center gap-2 mb-1", message.isMe && "flex-row-reverse")}>
                          <span className="text-sm font-medium text-white">{message.user}</span>
                          <span className="text-xs text-slate-500">{message.time}</span>
                        </div>
                        <div className={cn(
                          "px-3 py-2 rounded-xl text-sm",
                          message.isMe
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700 text-slate-200"
                        )}>
                          {message.msg}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="px-4 py-3 bg-slate-850 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                      <Paperclip className="h-5 w-5 text-slate-400" />
                    </button>
                    <input
                      type="text"
                      placeholder="Écrire un message..."
                      className="flex-1 bg-slate-700 border-none rounded-lg px-4 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                    <button className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                      <Send className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Features List */}
            <div className="space-y-6">
              {[
                {
                  icon: Hash,
                  title: "Canaux par équipe",
                  desc: "Commerciaux, livreurs, support... Chaque équipe a son espace dédié.",
                },
                {
                  icon: Lock,
                  title: "Chiffrement bout en bout",
                  desc: "Vos données restent privées. Hébergement sécurisé en Europe.",
                },
                {
                  icon: Bell,
                  title: "Notifications intelligentes",
                  desc: "Alertes sur mobile quand vous êtes mentionné. Ne manquez rien.",
                },
                {
                  icon: Search,
                  title: "Recherche dans l'historique",
                  desc: "Retrouvez n'importe quelle conversation en quelques secondes.",
                },
                {
                  icon: Paperclip,
                  title: "Partage de fichiers",
                  desc: "Documents, photos, PDF... Tout est centralisé et accessible.",
                },
                {
                  icon: Users,
                  title: "Intégré aux opérations",
                  desc: "Liez les conversations aux commandes, clients, et livraisons.",
                },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}

              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors mt-4"
              >
                Voir la Messagerie
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURE 3: SCAN IA MENUS */}
      {/* ============================================ */}
      <section id="scan" className="py-24 bg-gradient-to-b from-violet-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-4">
              <Scan className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Scan IA de Menus</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Photo du menu → <span className="text-violet-600">Devis en 30 secondes</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Scannez le menu d&apos;un restaurant, notre IA identifie les plats et génère
              automatiquement un devis personnalisé.
            </p>
          </div>

          {/* 3 Steps Visual */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: 1,
                icon: Camera,
                title: "Prenez une photo",
                desc: "Photographiez le menu du restaurant avec votre téléphone",
                visual: (
                  <div className="aspect-[4/3] bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-4 border-2 border-dashed border-violet-300 rounded-lg flex items-center justify-center">
                      <Camera className="h-12 w-12 text-violet-400" />
                    </div>
                    <div className="absolute bottom-2 right-2 w-16 h-16 bg-white rounded-lg shadow-lg p-2">
                      <div className="w-full h-full bg-gradient-to-br from-violet-100 to-purple-100 rounded flex items-center justify-center">
                        <FileText className="h-6 w-6 text-violet-500" />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                step: 2,
                icon: Bot,
                title: "L'IA analyse",
                desc: "Détection des plats, ingrédients, et matching avec votre catalogue",
                visual: (
                  <div className="aspect-[4/3] bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-hidden">
                    <div className="space-y-1">
                      <p className="text-violet-400">{">"} Analyse OCR en cours...</p>
                      <p>{">"} Détecté: &quot;Pizza Margherita&quot;</p>
                      <p>{">"} Détecté: &quot;Burger Classic&quot;</p>
                      <p>{">"} Détecté: &quot;Salade César&quot;</p>
                      <p className="text-amber-400">{">"} Matching catalogue...</p>
                      <p className="text-emerald-400">{">"} 12 produits matchés ✓</p>
                    </div>
                  </div>
                ),
              },
              {
                step: 3,
                icon: FileText,
                title: "Devis généré",
                desc: "Devis complet prêt à envoyer avec tous les produits et prix",
                visual: (
                  <div className="aspect-[4/3] bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">Devis #2024-0847</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Prêt</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span>Farine T55 x 25kg</span><span>€45</span></div>
                      <div className="flex justify-between"><span>Mozzarella x 5kg</span><span>€38</span></div>
                      <div className="flex justify-between"><span>Tomates pelées x 10</span><span>€28</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between font-bold">
                      <span>Total</span><span className="text-violet-600">€847</span>
                    </div>
                  </div>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="mb-4">{item.visual}</div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <item.icon className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/commercial"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
            >
              Essayer le Scan IA
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURE 4: EMAIL AUTOMATION */}
      {/* ============================================ */}
      <section id="automation" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 border border-rose-200 rounded-full mb-4">
              <Mail className="h-4 w-4 text-rose-600" />
              <span className="text-sm font-medium text-rose-700">Automatisation Email</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Séquences de prospection <span className="text-rose-600">automatisées</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Créez des campagnes email personnalisées par IA.
              Relances automatiques jusqu&apos;à la conversion.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Email Sequence Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-3xl blur-2xl" />
              <div className="relative space-y-4">
                {[
                  { day: "J+0", type: "email", icon: Mail, title: "Premier contact", status: "sent", stats: { opens: "68%", replies: "12%" } },
                  { day: "J+3", type: "email", icon: Reply, title: "Relance valeur", status: "sent", stats: { opens: "54%", replies: "8%" } },
                  { day: "J+7", type: "email", icon: MailOpen, title: "Offre spéciale", status: "scheduled", stats: null },
                  { day: "J+10", type: "task", icon: Phone, title: "Appel de suivi", status: "pending", stats: null },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        step.status === "sent" ? "bg-emerald-100" : step.status === "scheduled" ? "bg-amber-100" : "bg-slate-100"
                      )}>
                        <step.icon className={cn(
                          "h-6 w-6",
                          step.status === "sent" ? "text-emerald-600" : step.status === "scheduled" ? "text-amber-600" : "text-slate-400"
                        )} />
                      </div>
                      {i < 3 && <div className="w-0.5 h-8 bg-slate-200 my-2" />}
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">{step.day}</span>
                          <span className="font-semibold">{step.title}</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          step.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                          step.status === "scheduled" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {step.status === "sent" ? "Envoyé" : step.status === "scheduled" ? "Planifié" : "En attente"}
                        </span>
                      </div>
                      {step.stats && (
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-slate-500">Ouverture: <strong className="text-slate-700">{step.stats.opens}</strong></span>
                          <span className="text-slate-500">Réponse: <strong className="text-slate-700">{step.stats.replies}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Features */}
            <div className="space-y-6">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-rose-600" />
                  Emails générés par IA
                </h3>
                <p className="text-slate-600 mb-4">
                  Notre IA écrit des emails personnalisés basés sur le profil du prospect :
                  type de restaurant, localisation, score qualité...
                </p>
                <div className="bg-white rounded-lg p-4 text-sm">
                  <p className="text-slate-500 italic">
                    &quot;Bonjour [Prénom], j&apos;ai remarqué que votre restaurant [Nom] propose
                    une belle carte italienne. Nous fournissons déjà 12 restaurants
                    dans votre quartier en produits frais...&quot;
                  </p>
                </div>
              </div>

              {[
                { icon: Calendar, title: "Séquences multi-étapes", desc: "Emails, SMS, et tâches de rappel automatiquement planifiés" },
                { icon: Eye, title: "Tracking complet", desc: "Taux d'ouverture, clics, réponses en temps réel" },
                { icon: RefreshCw, title: "A/B Testing", desc: "Testez différents objets et contenus pour optimiser" },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-slate-600 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}

              <Link
                href="/prospects/automation"
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors"
              >
                Voir l&apos;Automation
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Et <span className="text-violet-600">bien plus</span> encore
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Une plateforme complète pour gérer toute votre activité de distribution.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allFeatures.map((feature, i) => (
              <div
                key={i}
                className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all"
              >
                <div className="p-3 bg-violet-100 rounded-xl w-fit mb-4 group-hover:bg-violet-600 transition-colors">
                  <feature.icon className="h-6 w-6 text-violet-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOUNDER / EXPERIENCE SECTION */}
      {/* ============================================ */}
      <section id="founder" className="py-24 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Story */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 rounded-full mb-6">
                <Award className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-violet-300">Créé par Face Media</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">
                20 ans dans le CHR, <br/>
                <span className="text-violet-400">un logiciel né du terrain</span>
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  Je m&apos;appelle <strong className="text-white">Faïcal Kriouar</strong>, fondateur de <strong className="text-white">Face Media</strong>.
                  J&apos;ai passé <strong className="text-white">20 ans</strong> dans le secteur CHR (Cafés, Hôtels, Restaurants)
                  dont <strong className="text-white">8 ans</strong> dans la distribution alimentaire.
                </p>
                <p>
                  J&apos;ai vécu les galères du quotidien : les heures perdues à chercher des prospects dans les Pages Jaunes,
                  les fichiers Excel qui plantent, les WhatsApp qui débordent, les tournées de livraison chaotiques...
                </p>
                <p>
                  Face Media a développé ce SaaS pour répondre à ces problèmes réels. Chaque fonctionnalité a été pensée
                  par quelqu&apos;un qui a vécu le terrain. Ce n&apos;est pas un logiciel créé par des développeurs déconnectés —
                  c&apos;est un outil <strong className="text-white">pensé par un professionnel du secteur, pour les professionnels</strong>.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  FK
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Faïcal Kriouar</p>
                  <p className="text-violet-400">Fondateur de Face Media</p>
                </div>
              </div>
            </div>

            {/* Right: Key achievements */}
            <div className="space-y-6">
              {[
                { number: "20", label: "ans dans le CHR", desc: "Cafés, Hôtels, Restaurants" },
                { number: "8", label: "ans en distribution", desc: "Distribution alimentaire B2B" },
                { number: "100%", label: "terrain", desc: "Chaque feature vient d'un besoin réel" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-violet-400">{stat.number}</div>
                    <div>
                      <p className="font-semibold text-white">{stat.label}</p>
                      <p className="text-sm text-slate-400">{stat.desc}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-6">
                <p className="text-white font-medium italic">
                  &ldquo;Ce logiciel, c&apos;est l&apos;outil que j&apos;aurais voulu avoir pendant toutes ces années sur le terrain.
                  Face Media l&apos;a construit pour vous.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* EMAIL FINDING EXPLANATION */}
      {/* ============================================ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 border border-cyan-200 rounded-full mb-4">
              <Mail className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-medium text-cyan-700">Enrichissement Email</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Comment l&apos;IA trouve les <span className="text-cyan-600">emails</span> ?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Notre système combine plusieurs sources pour trouver l&apos;email professionnel de chaque prospect.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                step: 1,
                icon: Globe,
                title: "Analyse du site web",
                desc: "L'IA scrape le site du restaurant et cherche les emails dans les pages contact, mentions légales, CGV...",
                example: "contact@lebistrot.fr",
              },
              {
                step: 2,
                icon: Search,
                title: "Pattern recognition",
                desc: "À partir du nom de domaine, l'IA génère et vérifie les patterns classiques (info@, contact@, hello@...)",
                example: "info@lebistrot.fr",
              },
              {
                step: 3,
                icon: Users,
                title: "Réseaux sociaux",
                desc: "Analyse des profils LinkedIn, Facebook, Instagram pour trouver les décideurs et leurs emails pro.",
                example: "pierre.dupont@lebistrot.fr",
              },
              {
                step: 4,
                icon: CheckCircle2,
                title: "Vérification SMTP",
                desc: "Chaque email est vérifié en temps réel pour s'assurer qu'il existe et qu'il est délivrable.",
                example: "✓ Email vérifié",
              },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <item.icon className="h-5 w-5 text-cyan-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm mb-3">{item.desc}</p>
                <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-mono text-cyan-700">
                  {item.example}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-8">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">Taux de réussite : 85%+</h3>
                <p className="text-slate-600">
                  Sur les prospects avec un site web, notre IA trouve un email valide dans plus de 85% des cas.
                  Les emails non trouvés sont marqués pour recherche manuelle.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-black text-cyan-600">85%</p>
                  <p className="text-sm text-slate-500">Emails trouvés</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-emerald-600">92%</p>
                  <p className="text-sm text-slate-500">Délivrabilité</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* AI LEARNING & CUSTOMIZATION */}
      {/* ============================================ */}
      <section className="py-24 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-200 rounded-full mb-4">
              <Bot className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">IA Auto-Apprenante</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Une IA qui <span className="text-amber-600">apprend</span> de votre activité
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              DISTRAM n&apos;utilise pas une IA générique. Notre modèle est <strong>entraîné spécifiquement</strong> sur
              la distribution alimentaire et s&apos;améliore en continu grâce à vos données.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Features */}
            <div className="space-y-6">
              {[
                {
                  icon: Package,
                  title: "Connaissance de votre catalogue",
                  desc: "L'IA connaît tous vos produits, leurs prix, leurs équivalences. Quand elle analyse un menu, elle sait exactement quoi proposer.",
                  highlight: "Matching produit intelligent",
                },
                {
                  icon: Target,
                  title: "Expert en restauration rapide",
                  desc: "Notre IA est spécialisée sur le secteur CHR (Cafés, Hôtels, Restaurants). Elle comprend les besoins spécifiques : volumes, fréquences, saisonnalité...",
                  highlight: "Spécialiste CHR",
                },
                {
                  icon: RefreshCw,
                  title: "Apprentissage continu",
                  desc: "Plus vous utilisez DISTRAM, plus l'IA devient précise. Elle apprend vos préférences, votre façon de travailler, vos clients types.",
                  highlight: "S'améliore avec le temps",
                },
                {
                  icon: Users,
                  title: "Adaptée à votre équipe",
                  desc: "L'IA s'adapte aux habitudes de chaque commercial : zones géographiques, types de clients préférés, argumentaires efficaces...",
                  highlight: "Personnalisée par utilisateur",
                },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{feature.title}</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Visual Demo */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="h-5 w-5 text-amber-400" />
                  <span className="font-medium">IA DISTRAM</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">En ligne</span>
                </div>

                <div className="space-y-4 font-mono text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Analyse du prospect...</p>
                    <p className="text-amber-400">{"> "}Restaurant italien • 45 couverts • Centre-ville Lyon</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Matching catalogue intelligent...</p>
                    <p className="text-emerald-400">{"> "}12 produits recommandés depuis votre catalogue</p>
                    <p className="text-slate-500 text-xs mt-1">Mozzarella, Farine 00, Tomates San Marzano...</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Basé sur des clients similaires...</p>
                    <p className="text-blue-400">{"> "}Panier moyen estimé : 850€/semaine</p>
                    <p className="text-slate-500 text-xs mt-1">3 restaurants similaires dans votre portefeuille</p>
                  </div>

                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg p-3 border border-amber-500/30">
                    <p className="text-amber-400 font-medium">{"> "}Score de qualification : 94%</p>
                    <p className="text-slate-400 text-xs mt-1">Prospect prioritaire recommandé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SAGE API FUTURE */}
      {/* ============================================ */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-4">
              <Zap className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">Prochainement</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-4">
              Intégration <span className="text-indigo-400">SAGE</span> à venir
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              DISTRAM sera bientôt connecté directement à votre ERP SAGE.
              Une révolution pour automatiser encore plus votre activité.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: RefreshCw,
                title: "Synchronisation bidirectionnelle",
                desc: "Clients, produits, commandes, factures... Tout se synchronise automatiquement entre DISTRAM et SAGE.",
              },
              {
                icon: Package,
                title: "Stocks en temps réel",
                desc: "Vos commerciaux voient les stocks réels directement depuis leur app. Plus de vente de produits épuisés.",
              },
              {
                icon: FileText,
                title: "Facturation automatique",
                desc: "Les commandes validées génèrent automatiquement les factures dans SAGE. Zéro ressaisie.",
              },
              {
                icon: BarChart3,
                title: "Analytics unifiés",
                desc: "Croisez les données DISTRAM et SAGE pour des insights business puissants.",
              },
              {
                icon: Users,
                title: "Fiche client unique",
                desc: "Une seule fiche client enrichie avec l'historique SAGE + les interactions DISTRAM.",
              },
              {
                icon: Zap,
                title: "Gain de temps x10",
                desc: "Fini les exports/imports manuels. Tout est automatisé, en temps réel.",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              DISTRAM + SAGE = La combinaison ultime
            </h3>
            <p className="text-slate-300 max-w-2xl mx-auto mb-6">
              Dès que l&apos;API SAGE sera intégrée, DISTRAM deviendra le centre névralgique de votre activité.
              Prospection, vente, livraison, facturation — tout dans un seul flux automatisé.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">
              <Bell className="h-4 w-4" />
              Intégration prévue T2 2025
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">Tarification flexible</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-4">
              Prix sur <span className="text-violet-400">devis</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
              Chaque entreprise est unique. Nous adaptons nos tarifs à vos besoins réels :
              nombre d&apos;utilisateurs, volume de commandes, fonctionnalités souhaitées.
            </p>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
              <h3 className="text-xl font-bold text-white mb-6">Toutes nos solutions incluent :</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  "Sourcing IA illimité",
                  "Messagerie sécurisée",
                  "Scan IA de menus",
                  "Automatisation email",
                  "Tracking GPS temps réel",
                  "CRM intégré",
                  "Portail client B2B",
                  "Application livreur",
                  "Support dédié",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/90">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+33123456789"
                className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-900 text-lg font-semibold rounded-xl transition-all hover:scale-105 shadow-2xl"
              >
                <Phone className="h-5 w-5" />
                Demander un devis
              </a>
              <Link
                href="/login"
                className="flex items-center gap-3 px-8 py-4 border-2 border-white/30 hover:border-white/50 text-white text-lg font-medium rounded-xl transition-all"
              >
                Essayer gratuitement
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Réponse sous 24h • Démonstration offerte • Sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black mb-4">
              Questions <span className="text-violet-600">fréquentes</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  <ChevronDown className={cn("h-5 w-5 flex-shrink-0 transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-violet-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-black text-white mb-6">
            Prêt à automatiser votre prospection ?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Rejoignez les grossistes qui génèrent 200+ prospects par semaine grâce à DISTRAM.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group flex items-center gap-3 px-8 py-4 bg-white text-violet-600 text-lg font-semibold rounded-xl transition-all hover:scale-105 shadow-2xl"
            >
              Démarrer l&apos;essai gratuit
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="tel:+33123456789"
              className="flex items-center gap-3 px-8 py-4 border-2 border-white/30 hover:border-white/50 text-white text-lg font-medium rounded-xl transition-all"
            >
              <Phone className="h-5 w-5" />
              Parler à un expert
            </a>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Essai gratuit 14 jours • Sans engagement • Support inclus
          </p>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Démo Live</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black mb-2">
              Explorez l&apos;application
            </h2>
            <p className="text-slate-600">
              Cliquez sur un module pour voir la démo en action
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
              { href: "/commercial", icon: Target, label: "Espace Commercial", color: "from-violet-500 to-purple-600" },
              { href: "/livreur", icon: Truck, label: "Module Livreur", color: "from-blue-500 to-cyan-600" },
              { href: "/prospects", icon: Users, label: "CRM Prospects", color: "from-emerald-500 to-teal-600" },
              { href: "/prospects/sourcing", icon: Search, label: "Sourcing IA", color: "from-amber-500 to-orange-600" },
              { href: "/prospects/automation", icon: Mail, label: "Automation Email", color: "from-pink-500 to-rose-600" },
              { href: "/tracking", icon: MapPin, label: "GPS Tracking", color: "from-indigo-500 to-blue-600" },
              { href: "/orders", icon: ShoppingCart, label: "Commandes", color: "from-green-500 to-emerald-600" },
              { href: "/chat", icon: MessageSquare, label: "Chat Équipe", color: "from-teal-500 to-cyan-600" },
              { href: "/portail", icon: Globe, label: "Portail B2B", color: "from-cyan-500 to-blue-600" },
              { href: "/catalogues", icon: Package, label: "Catalogues", color: "from-orange-500 to-red-600" },
              { href: "/supervision", icon: BarChart3, label: "Supervision", color: "from-purple-500 to-violet-600" },
              { href: "/analytics", icon: BarChart3, label: "Analytics", color: "from-slate-500 to-slate-700" },
              { href: "/clients", icon: Building2, label: "Clients", color: "from-rose-500 to-pink-600" },
              { href: "/settings", icon: Award, label: "Paramètres", color: "from-gray-500 to-slate-600" },
              { href: "/", icon: BarChart3, label: "Dashboard", color: "from-violet-600 to-purple-700" },
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all"
              >
                <div className={cn("p-3 rounded-xl bg-gradient-to-r text-white group-hover:scale-110 transition-transform", item.color)}>
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-sm text-center text-slate-700">{item.label}</span>
              </Link>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Utilisez le bouton <strong>&quot;Vue Mobile&quot;</strong> sur chaque page pour voir la version iPhone
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/welcome" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold">D</div>
                <span className="text-xl font-bold">DISTRAM</span>
              </Link>
              <p className="text-slate-400 text-sm mb-4">
                La plateforme tout-en-un pour les grossistes alimentaires.
              </p>
              <p className="text-slate-500 text-xs">© 2025 Face Media. Tous droits réservés.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#sourcing" className="hover:text-white transition-colors">Sourcing IA</a></li>
                <li><a href="#messaging" className="hover:text-white transition-colors">Messagerie</a></li>
                <li><a href="#scan" className="hover:text-white transition-colors">Scan IA</a></li>
                <li><a href="#automation" className="hover:text-white transition-colors">Automation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/scan-menu" className="hover:text-white transition-colors">Scan Menu IA</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="/analytics" className="hover:text-white transition-colors">Analytics</a></li>
                <li><a href="/portail" className="hover:text-white transition-colors">Portail B2B</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:support@facemedia.fr" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="mailto:commercial@facemedia.fr" className="hover:text-white transition-colors">Ventes</a></li>
                <li><a href="/referral" className="hover:text-white transition-colors">Parrainage</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex gap-6">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
              <Link href="/register" className="hover:text-white transition-colors">Inscription</Link>
            </div>
            <p>© 2025 DISTRAM by Face Media</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

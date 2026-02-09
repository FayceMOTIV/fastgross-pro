"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISTRAM_COLORS } from "@/lib/theme-distram";

// Constante pour le numéro de Faiçal
const FAICAL_PHONE = "06 02 10 07 74";
const FAICAL_PHONE_LINK = "tel:+33602100774";
import {
  CheckCircle,
  ArrowRight,
  Phone,
  Users,
  Truck,
  BarChart3,
  Settings,
  ShoppingCart,
  Brain,
  Star,
  ChevronDown,
} from "lucide-react";

// ============================================
// COMPOSANTS RÉUTILISABLES
// ============================================

function PainCard({
  emoji,
  title,
  description,
  cost,
}: {
  emoji: string;
  title: string;
  description: string;
  cost: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
      <p className="text-red-500 font-semibold text-sm">{cost}</p>
    </div>
  );
}

function PromiseCard({
  before,
  after,
  description,
}: {
  before: string;
  after: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Avant</p>
          <p className="text-red-500 font-bold line-through">{before}</p>
        </div>
        <ArrowRight className="text-[#F5A623] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Après</p>
          <p className="text-green-600 font-bold">{after}</p>
        </div>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function ModeCard({
  number,
  title,
  subtitle,
  icon: Icon,
  color,
  benefits,
  link,
}: {
  number: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  benefits: Array<{ title: string; gain: string; money: string }>;
  link: string;
}) {
  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
    gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600" },
  };
  const c = colorClasses[color] || colorClasses.blue;

  return (
    <div className={cn("rounded-2xl p-8 border-2", c.bg, c.border)}>
      <div className="flex items-start gap-4 mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", c.text, "bg-white shadow-sm")}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className={cn("text-sm font-bold", c.text)}>MODE {number}</p>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-600">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4 mb-6">
        {benefits.map((b, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <p className="font-semibold text-gray-900 mb-1">{b.title}</p>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">{b.gain}</span>
              <span className="text-[#F5A623] font-bold">{b.money}</span>
            </div>
          </div>
        ))}
      </div>
      <Link
        href={link}
        className={cn("inline-flex items-center gap-2 font-semibold hover:gap-3 transition-all", c.text)}
      >
        Voir le mode {title} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function AIFeature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#F5A623]/20 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
}

function PartnerCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function ROILine({
  label,
  detail,
  value,
  highlight,
}: {
  label: string;
  detail?: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-center", highlight && "text-xl")}>
      <div>
        <p className={cn("font-semibold", highlight && "text-[#F5A623]")}>{label}</p>
        {detail && <p className="text-sm text-gray-500">{detail}</p>}
      </div>
      <p className={cn("font-bold text-right", highlight ? "text-2xl text-[#F5A623]" : "text-gray-900")}>{value}</p>
    </div>
  );
}

// Animation de conversation IA
function ConversationMockup() {
  const messages = [
    { from: "client", text: "Salut, c'est quoi le prix du kebab ?" },
    { from: "ia", text: "Bonjour ! Le kebab DISTRAM est à 4,20€/kg. Tu en veux combien ?" },
    { from: "client", text: "50kg, tu livres quand ?" },
    { from: "ia", text: "Parfait ! 50kg = 210€ HT. Livraison demain matin avant 10h. Je valide ?" },
    { from: "client", text: "Go !" },
    { from: "ia", text: "✅ Commande validée ! Tu recevras un SMS 30min avant livraison. Bonne journée !" },
  ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < messages.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), 1500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisibleCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, messages.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
        <div className="w-10 h-10 rounded-full bg-[#F5A623] flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-white">Agent IA DISTRAM</p>
          <p className="text-xs text-green-400">● En ligne 24/7</p>
        </div>
      </div>
      {messages.slice(0, visibleCount).map((msg, i) => (
        <div key={i} className={cn("flex", msg.from === "client" ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
              msg.from === "client" ? "bg-[#F5A623] text-black" : "bg-gray-700 text-white"
            )}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {visibleCount < messages.length && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-2xl px-4 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Scroll reveal
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function OffreDistramPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* ===================== NAV STICKY ===================== */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300",
          isScrolled ? "bg-[#1A1A1A]/95 backdrop-blur-xl shadow-lg" : "bg-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{
                background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)`,
              }}
            >
              D
            </div>
            <span className={cn("font-bold text-lg", isScrolled ? "text-white" : "text-white")}>
              DISTRAM × FACE MEDIA
            </span>
          </div>
          <a
            href={FAICAL_PHONE_LINK}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
          >
            <Phone className="w-4 h-4" />
            <span className="hidden md:inline">{FAICAL_PHONE}</span>
          </a>
        </div>
      </nav>

      {/* ===================== SECTION 1: HERO ===================== */}
      <section className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-gray-900 to-[#1A1A1A] text-white flex items-center pt-20">
        <div className="container mx-auto px-4 py-16 text-center">
          <Reveal>
            <div
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm mb-8 animate-pulse"
              style={{ background: `${DISTRAM_COLORS.primary}20`, color: DISTRAM_COLORS.primary }}
            >
              <Star className="w-4 h-4" />
              Proposition exclusive pour DISTRAM
            </div>
          </Reveal>

          <Reveal className="delay-100">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              Et si tes commerciaux
              <br />
              <span style={{ color: DISTRAM_COLORS.primary }}>closaient 3x plus</span>
              <br />
              sans travailler plus ?
            </h1>
          </Reveal>

          <Reveal className="delay-200">
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Hamza, on a construit cette plateforme pour que DISTRAM vende plus, perde moins de clients, et que tu
              puisses enfin <span style={{ color: DISTRAM_COLORS.primary }}>dormir tranquille</span>.
            </p>
          </Reveal>

          <Reveal className="delay-300">
            <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
              <a
                href="#gains"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-xl font-semibold rounded-xl transition-all hover:-translate-y-1"
                style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
              >
                Voir ce que tu vas gagner <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal className="delay-400">
            <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-gray-400">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">156 000€</p>
                <p className="text-sm">d&apos;économies/an</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">24/7</p>
                <p className="text-sm">IA qui vend pour vous</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">30 sec</p>
                <p className="text-sm">pour un devis</p>
              </div>
            </div>
          </Reveal>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </section>

      {/* ===================== SECTION 2: LA DOULEUR ===================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              On sait ce que tu vis, Hamza.
            </h2>
            <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
              Après 30 ans à construire DISTRAM, tu mérites mieux que ça.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Reveal>
              <PainCard
                emoji="😤"
                title="2 heures pour UN devis"
                description="Ton commercial visite un kebab, note le menu sur un papier, rentre au bureau, cherche les prix, fait le devis dans Excel... Pendant ce temps, la concurrence a déjà signé."
                cost="→ 15 000€/an perdus en temps commercial"
              />
            </Reveal>
            <Reveal className="delay-100">
              <PainCard
                emoji="📞"
                title="Le téléphone qui sonne H24"
                description="'C'est quoi le prix du kebab ?' 'Vous livrez demain ?' 'J'ai oublié ma commande'... Même le dimanche. Même à 22h. Tes équipes n'en peuvent plus."
                cost="→ 8h/semaine perdues à répondre"
              />
            </Reveal>
            <Reveal className="delay-200">
              <PainCard
                emoji="🔮"
                title="Aucune visibilité"
                description="Lyon fait quoi ? Bordeaux a combien de commandes ? Ce client a pas commandé depuis 3 semaines, il se passe quoi ? Tu pilotes à l'aveugle."
                cost="→ Décisions au doigt mouillé"
              />
            </Reveal>
            <Reveal className="delay-300">
              <PainCard
                emoji="💸"
                title="Clients qui partent en silence"
                description="Tu découvres qu'un client est parti... 2 mois après. Il commande chez le concurrent maintenant. Personne n'a vu les signaux."
                cost="→ 12 000€/client perdu"
              />
            </Reveal>
            <Reveal className="delay-400">
              <PainCard
                emoji="🚗"
                title="Livreurs qui tournent en rond"
                description="Tes livreurs font 50km de plus que nécessaire chaque jour. Essence, temps, usure des véhicules. Et des clients qui attendent."
                cost="→ 36 000€/an en carburant gaspillé"
              />
            </Reveal>
            <Reveal className="delay-500">
              <PainCard
                emoji="😴"
                title="Toi, à 23h"
                description="T'es encore en train de penser au boulot. 'J'ai oublié de rappeler ce client.' 'Il faut que je vérifie les stocks.' Jamais tranquille."
                cost="→ Ta santé, ta famille"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION FAIÇAL — PREUVE SOCIALE ===================== */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar Faiçal */}
                <div className="flex-shrink-0">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)`,
                    }}
                  >
                    F
                  </div>
                </div>

                {/* Texte */}
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Tu me connais, Hamza.{" "}
                    <span style={{ color: DISTRAM_COLORS.primary }}>Je connais ton métier.</span>
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tu sais que j&apos;ai dirigé{" "}
                    <span className="font-bold text-gray-900">Marketfood pendant 8 ans</span>. Et avant ça,{" "}
                    <span className="font-bold text-gray-900">15 ans dans la restauration</span>.
                  </p>
                  <p className="text-gray-600 mb-4">
                    Je connais tes galères : les devis qui prennent des heures, les clients qui appellent à 22h, les
                    livreurs qui tournent en rond, les commerciaux qui perdent des prospects.{" "}
                    <span className="font-bold">Je les ai vécues.</span>
                  </p>
                  <p className="text-gray-600">
                    Cette plateforme, je l&apos;ai construite pour résoudre les problèmes que j&apos;aurais voulu
                    résoudre quand j&apos;étais à ta place.
                  </p>

                  {/* Stats expérience */}
                  <div className="flex gap-8 mt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold" style={{ color: DISTRAM_COLORS.primary }}>
                        8 ans
                      </p>
                      <p className="text-sm text-gray-500">Marketfood</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold" style={{ color: DISTRAM_COLORS.primary }}>
                        15 ans
                      </p>
                      <p className="text-sm text-gray-500">Restauration</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold" style={{ color: DISTRAM_COLORS.primary }}>
                        23 ans
                      </p>
                      <p className="text-sm text-gray-500">Dans ton secteur</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== SECTION 3: LA PROMESSE ===================== */}
      <section id="gains" className="py-20" style={{ background: `${DISTRAM_COLORS.primary}10` }}>
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Imaginez <span style={{ color: DISTRAM_COLORS.primary }}>DISTRAM</span> dans 3 mois
            </h2>
            <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
              Tout ça, sans embaucher personne. Sans te former pendant 6 mois. Sans investir des millions.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Reveal>
              <PromiseCard
                before="2h pour un devis"
                after="30 secondes"
                description="L'IA scanne le menu, génère le devis. Ton commercial n'a plus qu'à closer."
              />
            </Reveal>
            <Reveal className="delay-100">
              <PromiseCard
                before="Appels clients H24"
                after="L'IA répond à votre place"
                description="Questions, commandes, réclamations. L'IA gère. Même à 3h du matin."
              />
            </Reveal>
            <Reveal className="delay-200">
              <PromiseCard
                before="Tes 3 dépôts, 0 visibilité"
                after="1 écran, tout en temps réel"
                description="Lyon, Montpellier, Bordeaux. Stocks, commandes, performances. Tout."
              />
            </Reveal>
            <Reveal className="delay-300">
              <PromiseCard
                before="Clients qui partent"
                after="Alertes 2 semaines AVANT"
                description="L'IA détecte les signaux faibles. Tu interviens avant qu'il soit trop tard."
              />
            </Reveal>
            <Reveal className="delay-400">
              <PromiseCard
                before="50km de trop/jour"
                after="Tournées optimisées par l'IA"
                description="Moins de km, plus de livraisons. Tes livreurs rentrent plus tôt."
              />
            </Reveal>
            <Reveal className="delay-500">
              <PromiseCard
                before="Toi à 23h, stressé"
                after="Toi à 23h, en famille"
                description="L'IA veille. Tu reçois un résumé le matin. Dors tranquille."
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: LES 5 MODES ===================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              5 outils. 5 problèmes résolus.
            </h2>
            <p className="text-center text-gray-500 mb-16">
              Chaque équipe a son interface. Chaque interface a un objectif : vous faire gagner.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Reveal>
              <ModeCard
                number="01"
                title="Commercial"
                subtitle="Tes 8 commerciaux vont closer 3x plus"
                icon={Users}
                color="blue"
                benefits={[
                  { title: "Scan Menu IA → Devis en 30 sec", gain: "2h économisées/devis", money: "15 000€/an" },
                  { title: "Prospection IA automatique", gain: "+15 prospects/mois", money: "Sans effort" },
                  { title: "Assistant terrain intelligent", gain: "+20% closing", money: "Plus de ventes" },
                ]}
                link="/commercial"
              />
            </Reveal>

            <Reveal className="delay-100">
              <ModeCard
                number="02"
                title="Livreur"
                subtitle="Moins de km, plus de livraisons"
                icon={Truck}
                color="green"
                benefits={[
                  { title: "Tournées optimisées par l'IA", gain: "-30% de km", money: "36 000€/an" },
                  { title: "Notifications client auto", gain: "-40% attente", money: "+2 livr./jour" },
                  { title: "Preuve de livraison digitale", gain: "0 litige", money: "0 remboursement" },
                ]}
                link="/livreur"
              />
            </Reveal>

            <Reveal className="delay-200">
              <ModeCard
                number="03"
                title="Manager"
                subtitle="Pilote tes 3 dépôts sur 1 seul écran"
                icon={BarChart3}
                color="purple"
                benefits={[
                  { title: "Dashboard temps réel multi-dépôts", gain: "100% visibilité", money: "Data-driven" },
                  { title: "Alertes intelligentes", gain: "Anticipation", money: "0 surprise" },
                  { title: "Rapports automatiques", gain: "2h/semaine", money: "Focus essentiel" },
                ]}
                link="/supervision"
              />
            </Reveal>

            <Reveal className="delay-300">
              <ModeCard
                number="04"
                title="Admin"
                subtitle="Configurez tout, sans nous appeler"
                icon={Settings}
                color="gray"
                benefits={[
                  { title: "Gestion des utilisateurs", gain: "Autonomie totale", money: "0 ticket" },
                  { title: "Paramètres personnalisables", gain: "Flexibilité", money: "Sur-mesure" },
                ]}
                link="/settings"
              />
            </Reveal>

            <Reveal className="delay-400 lg:col-span-2">
              <ModeCard
                number="05"
                title="Portail Client B2B"
                subtitle="Tes 300 clients commandent en ligne, 24h/24"
                icon={ShoppingCart}
                color="orange"
                benefits={[
                  { title: "Commandes en ligne 24/7", gain: "-70% d'appels", money: "Focus vente" },
                  { title: "Historique et récommande", gain: "+25% récurrence", money: "Panier +" },
                  { title: "Agent IA intégré", gain: "0 question sans réponse", money: "Satisfaction max" },
                ]}
                link="/portail"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 5: L'IA ===================== */}
      <section className="py-20 bg-[#1A1A1A] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
                style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
              >
                <Brain className="w-4 h-4" /> L&apos;arme secrète
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Un commercial qui
                <br />
                <span style={{ color: DISTRAM_COLORS.primary }}>ne dort jamais.</span>
                <br />
                <span style={{ color: DISTRAM_COLORS.primary }}>Ne fatigue jamais.</span>
                <br />
                <span style={{ color: DISTRAM_COLORS.primary }}>Ne démissionne jamais.</span>
              </h2>

              <p className="text-xl text-gray-300 mb-8">
                L&apos;agent IA DISTRAM répond à tes clients 24h/24, 7j/7. Il connaît tes 98 produits par cœur. Il
                suggère, il vend, il fidélise. Pendant que tu dors.
              </p>

              <div className="space-y-4 mb-8">
                <AIFeature
                  icon="⚡"
                  title="Répond en 2 secondes"
                  description="Pas de 'veuillez patienter'. Réponse instantanée, à 3h du matin comme à 14h."
                />
                <AIFeature
                  icon="🧠"
                  title="Apprend en continu"
                  description="Plus il discute avec tes clients, plus il comprend leurs besoins."
                />
                <AIFeature
                  icon="🎯"
                  title="Cross-sell intelligent"
                  description="'Tu prends du kebab ? Je te conseille nos pains pita.' +15% de panier moyen."
                />
                <AIFeature
                  icon="🔮"
                  title="Prédit les besoins"
                  description="'Ça fait 2 semaines que tu n'as pas commandé de sauce.' L'IA anticipe."
                />
                <AIFeature
                  icon="💬"
                  title="WhatsApp & Web"
                  description="Tes clients lui parlent par message. Comme à un pote qui vend pour toi."
                />
              </div>

              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-1"
                style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
              >
                Tester l&apos;agent IA <ArrowRight className="w-5 h-5" />
              </Link>
            </Reveal>

            {/* Mockup conversation */}
            <Reveal className="delay-200">
              <div className="relative">
                <div
                  className="absolute -top-10 -right-10 w-64 h-64 rounded-full blur-3xl"
                  style={{ background: `${DISTRAM_COLORS.primary}30` }}
                />
                <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl relative z-10 border border-gray-700">
                  <ConversationMockup />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 6: FACE MEDIA PARTENAIRE ===================== */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              <span style={{ color: DISTRAM_COLORS.primary }}>FACE MEDIA</span> gère tout.
              <br />
              Vous, vous vendez.
            </h2>
            <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
              Pas besoin d&apos;embaucher un développeur. Pas besoin de comprendre la tech. On est là. Tout le temps.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Reveal>
              <PartnerCard icon="🛡️" title="Support 7j/7" description="Un problème à 21h un samedi ? On répond. Par téléphone, WhatsApp, mail." />
            </Reveal>
            <Reveal className="delay-100">
              <PartnerCard icon="🚀" title="Mises à jour gratuites" description="Chaque mois, de nouvelles fonctionnalités. Sans payer plus." />
            </Reveal>
            <Reveal className="delay-200">
              <PartnerCard icon="🎓" title="Formation équipes" description="On forme tes 8 commerciaux jusqu'à ce qu'ils maîtrisent." />
            </Reveal>
            <Reveal className="delay-300">
              <PartnerCard icon="🔧" title="Personnalisation incluse" description="Tes couleurs, ton logo, tes process. On adapte tout." />
            </Reveal>
            <Reveal className="delay-400">
              <PartnerCard icon="📊" title="Rapports mensuels" description="Un bilan chaque mois. Ce qui marche, ce qu'on améliore." />
            </Reveal>
            <Reveal className="delay-500">
              <PartnerCard icon="🤝" title="Partenaire, pas prestataire" description="Ton succès, c'est notre succès. Ensemble." />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 7: LE ROI ===================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Le calcul est simple, Hamza.</h2>
            <p className="text-center text-gray-600 mb-16">
              Basé sur tes vrais chiffres : 300 clients, 8 commerciaux, 3 dépôts.
            </p>
          </Reveal>

          <div className="max-w-4xl mx-auto">
            {/* Gains */}
            <Reveal>
              <div className="rounded-2xl p-8 mb-8" style={{ background: `${DISTRAM_COLORS.primary}15` }}>
                <h3 className="text-xl font-bold mb-6">Ce que vous GAGNEZ chaque année :</h3>
                <div className="space-y-4">
                  <ROILine label="Temps commercial récupéré" detail="2h/devis × 8 commerciaux × 200 devis/an" value="+78 000€" />
                  <ROILine label="Clients sauvés (anti-churn)" detail="10 clients × 12 000€/client" value="+120 000€" />
                  <ROILine label="Carburant économisé" detail="Tournées optimisées, -30% de km" value="+36 000€" />
                  <ROILine label="Ventes additionnelles (cross-sell IA)" detail="+15% panier moyen" value="+45 000€" />
                  <ROILine label="Appels évités (portail + IA)" detail="70% d'appels en moins" value="+12 000€" />
                  <div className="border-t-2 pt-4 mt-4" style={{ borderColor: DISTRAM_COLORS.primary }}>
                    <ROILine label="TOTAL GAINS ANNUELS" value="+291 000€" highlight />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Investissement — Sur mesure */}
            <Reveal className="delay-100">
              <div
                className="rounded-2xl p-8 mb-8 text-center"
                style={{ background: `${DISTRAM_COLORS.primary}20` }}
              >
                <p className="text-lg text-gray-600 mb-2">Investissement</p>
                <p className="text-3xl font-bold mb-4" style={{ color: DISTRAM_COLORS.black }}>
                  Sur mesure selon vos besoins
                </p>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Chaque grossiste est différent. On construit TA solution selon tes équipes, tes dépôts, tes
                  objectifs. Appelle-moi pour un devis gratuit en 24h.
                </p>
                <a
                  href={FAICAL_PHONE_LINK}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-1"
                  style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
                >
                  <Phone className="w-5 h-5" />
                  {FAICAL_PHONE}
                </a>
              </div>
            </Reveal>

            {/* ROI */}
            <Reveal className="delay-200">
              <div className="bg-[#1A1A1A] text-white rounded-2xl p-8 text-center">
                <p className="text-gray-400 mb-2">Ce que vous gagnez</p>
                <p className="text-5xl font-black mb-2" style={{ color: DISTRAM_COLORS.primary }}>
                  +291 000€/an
                </p>
                <p className="text-xl text-gray-300">de gains potentiels avec la plateforme complète</p>
                <p className="font-bold mt-4" style={{ color: DISTRAM_COLORS.primary }}>
                  → ROI garanti dès les premiers mois
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 8: L'OFFRE ===================== */}
      <section id="offre" className="py-20 bg-[#1A1A1A] text-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              L&apos;offre <span style={{ color: DISTRAM_COLORS.primary }}>DISTRAM</span>
            </h2>
          </Reveal>

          <Reveal className="delay-100">
            <div
              className="max-w-3xl mx-auto rounded-3xl p-8 md:p-12 border"
              style={{
                background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                borderColor: `${DISTRAM_COLORS.primary}50`,
              }}
            >
              <div className="text-center mb-8">
                <p className="font-bold text-lg mb-2" style={{ color: DISTRAM_COLORS.primary }}>
                  Offre sur mesure
                </p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl md:text-5xl font-black">Devis personnalisé</span>
                </div>
                <p className="text-gray-400 mt-4 max-w-md mx-auto">
                  Chaque grossiste est différent. On construit TA solution selon tes besoins, tes équipes, tes
                  objectifs.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-bold mb-4" style={{ color: DISTRAM_COLORS.primary }}>
                    📦 Modules disponibles
                  </h4>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Mode Commercial (CRM + Scan IA)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Mode Livreur (Tournées GPS)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Mode Manager (Dashboard multi-dépôts)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Mode Admin (Paramètres)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Portail Client B2B
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Agent IA vendeur 24/7
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Intégrations (WhatsApp, SMS, Email)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold mb-4" style={{ color: DISTRAM_COLORS.primary }}>
                    ✅ Toujours inclus
                  </h4>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Support 7j/7 par Faiçal
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Formation de tes équipes
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Mises à jour gratuites
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Personnalisation à tes couleurs
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Import de tes données
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Hébergement sécurisé
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      Accompagnement continu
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <a
                  href={FAICAL_PHONE_LINK}
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto text-xl px-12 py-4 rounded-xl font-semibold transition-all hover:-translate-y-1"
                  style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
                >
                  <Phone className="w-5 h-5" />
                  Appelle-moi pour ton devis →
                </a>
                <p className="text-gray-500 text-sm mt-4">
                  Appelle-moi :{" "}
                  <a href={FAICAL_PHONE_LINK} className="hover:underline" style={{ color: DISTRAM_COLORS.primary }}>
                    {FAICAL_PHONE}
                  </a>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== SECTION 9: URGENCE ===================== */}
      <section className="py-16" style={{ background: DISTRAM_COLORS.primary }}>
        <div className="container mx-auto px-4 text-center" style={{ color: DISTRAM_COLORS.black }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ⚠️ Cette offre est valable jusqu&apos;au 28 février 2026
          </h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto">
            On ne peut accompagner qu&apos;un nombre limité de clients avec ce niveau de service. Après DISTRAM, on
            passe au suivant. Les conditions peuvent changer.
          </p>
          <a
            href="#offre"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:-translate-y-1"
            style={{ background: DISTRAM_COLORS.black, color: "white" }}
          >
            Sécuriser cette offre maintenant
          </a>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-8 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Cette démo a été créée par{" "}
            <span className="font-medium text-white">FACE MEDIA GROSSISTE</span> exclusivement pour{" "}
            <span className="font-medium" style={{ color: DISTRAM_COLORS.primary }}>
              DISTRAM
            </span>
            .
          </p>
          <p className="text-gray-500 text-sm mt-2">© 2026 FACE MEDIA — Votre partenaire digitalisation</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DISTRAM_COLORS, DISTRAM_INFO, FACE_MEDIA_INFO } from "@/lib/theme-distram";

// Scroll reveal hook
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Reveal wrapper component
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
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* ===================== NAV ===================== */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-8 py-4 transition-all duration-300",
          isScrolled && "bg-white/95 backdrop-blur-xl shadow-sm"
        )}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-extrabold text-xl text-gray-900">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
            >
              D
            </div>
            <div>
              <span className="text-xl font-black" style={{ color: DISTRAM_COLORS.black }}>{DISTRAM_INFO.name}</span>
              <div className="text-[10px] text-gray-400 font-normal -mt-1">{DISTRAM_INFO.slogan}</div>
            </div>
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            <li><a href="#expertise" className="text-gray-600 font-medium hover:text-[#F5A623] transition-colors">Notre expertise</a></li>
            <li><a href="#solutions" className="text-gray-600 font-medium hover:text-[#F5A623] transition-colors">Solutions</a></li>
            <li><a href="#ia" className="text-gray-600 font-medium hover:text-[#F5A623] transition-colors">L&apos;IA DISTRAM</a></li>
            <li><a href="#contact" className="text-gray-600 font-medium hover:text-[#F5A623] transition-colors">Contact</a></li>
            <li>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)`,
                  boxShadow: `0 10px 30px -5px rgba(245, 166, 35, 0.4)`
                }}
              >
                Accéder à la plateforme
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="pt-40 pb-24 px-8 text-center relative overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/5 w-[140%] h-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center top, rgba(245, 166, 35, 0.08) 0%, transparent 60%)` }}
        />

        <div className="animate-fadeUp">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm mb-8"
            style={{ background: `rgba(245, 166, 35, 0.1)`, color: DISTRAM_COLORS.primary }}
          >
            <span>🏆</span> {DISTRAM_INFO.experience} d&apos;excellence — {DISTRAM_INFO.depots.join(", ")}
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-gray-900 max-w-[900px] mx-auto mb-6 leading-tight animate-fadeUp animation-delay-100">
          <span style={{ color: DISTRAM_COLORS.primary }}>{DISTRAM_INFO.name}</span>
          <br />
          {DISTRAM_INFO.slogan}
        </h1>

        <p className="text-xl text-gray-500 max-w-[680px] mx-auto mb-10 leading-relaxed animate-fadeUp animation-delay-200">
          Le partenaire de confiance de <strong>+{DISTRAM_INFO.clients} restaurants</strong> en France.
          Distribution halal certifiée, qualité irréprochable, technologie de pointe.
        </p>

        <div className="flex gap-4 justify-center flex-wrap animate-fadeUp animation-delay-300">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all text-lg"
            style={{
              background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)`,
              boxShadow: `0 10px 30px -5px rgba(245, 166, 35, 0.4)`
            }}
          >
            Découvrir la plateforme DISTRAM →
          </Link>
          <a
            href={`tel:${DISTRAM_INFO.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-gray-900 font-semibold rounded-xl border-2 border-gray-300 hover:border-[#F5A623] hover:text-[#F5A623] transition-all text-lg"
          >
            📞 {DISTRAM_INFO.phone}
          </a>
        </div>

        {/* Certifications */}
        <div className="flex justify-center gap-6 mt-12 animate-fadeUp animation-delay-400">
          {DISTRAM_INFO.certifications.map((cert, i) => (
            <div
              key={i}
              className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span>✓</span> {cert}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 mt-16 pt-12 border-t border-gray-100 animate-fadeUp animation-delay-400">
          {[
            { number: DISTRAM_INFO.experience, label: "d'expérience dans\nla distribution halal" },
            { number: `${DISTRAM_INFO.clients}+`, label: "restaurants\nclients fidèles" },
            { number: `${DISTRAM_INFO.depots.length}`, label: "dépôts en France\npour vous servir" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-extrabold" style={{ color: DISTRAM_COLORS.primary }}>
                {stat.number}
              </div>
              <div className="text-gray-500 text-sm mt-1 whitespace-pre-line">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== EXPERTISE ===================== */}
      <section id="expertise" className="py-24 px-8" style={{ background: DISTRAM_COLORS.black }}>
        <Reveal>
          <div className="max-w-[1100px] mx-auto text-white">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: DISTRAM_COLORS.primary }}>Notre expertise</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-12 leading-tight">
              Le spécialiste du snacking halal
              <br />
              <span style={{ color: DISTRAM_COLORS.primary }}>depuis 1993</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "🥙",
                  title: "Kebabs & Restaurants rapides",
                  desc: "Viandes, sauces, pains, fromages — tout ce dont vous avez besoin pour satisfaire vos clients. Qualité constante, approvisionnement fiable.",
                },
                {
                  icon: "🍕",
                  title: "Pizzerias & Tacos",
                  desc: "Ingrédients premium pour créer des recettes qui fidélisent. Du fromage qui file aux sauces maison, nous avons tout.",
                },
                {
                  icon: "🍔",
                  title: "Burgers & Street Food",
                  desc: "Viandes hachées, buns, accompagnements — la qualité DISTRAM pour des burgers qui font revenir les clients.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all"
                  style={{ borderColor: `rgba(245, 166, 35, 0.2)` }}
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-white/60 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== DEPOTS ===================== */}
      <section className="py-20 px-8" style={{ background: `linear-gradient(135deg, rgba(245, 166, 35, 0.05) 0%, rgba(245, 166, 35, 0.1) 100%)` }}>
        <Reveal>
          <div className="max-w-[1100px] mx-auto text-center">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: DISTRAM_COLORS.primary }}>Nos dépôts</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12">
              Proche de vous, partout en France
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {DISTRAM_INFO.depots.map((depot, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all"
                >
                  <div className="text-5xl mb-4">📍</div>
                  <h3 className="text-2xl font-bold text-gray-900">{depot}</h3>
                  <p className="text-gray-500 mt-2">Livraison rapide dans toute la région</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== SOLUTIONS ===================== */}
      <section id="solutions" className="py-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: DISTRAM_COLORS.primary }}>Solutions DISTRAM</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
              La technologie au service de votre business
            </h2>
            <p className="text-gray-500 text-lg max-w-[600px] mx-auto">
              DISTRAM innove pour vous simplifier la vie. Commandes en ligne, livraisons optimisées, assistants IA.
            </p>
          </Reveal>

          {/* Benefit rows */}
          {[
            {
              color: "orange",
              bg: `rgba(245, 166, 35, 0.1)`,
              number: "24/7",
              label: "Commandez quand vous voulez",
              tag: "🛒 Portail de commande",
              title: "Commandez en ligne à toute heure. Recevez le lendemain.",
              desc: "Plus besoin d'appeler ou d'envoyer des SMS. Connectez-vous à votre espace DISTRAM, passez commande en quelques clics, et on s'occupe du reste.",
              bullets: [
                "Votre catalogue personnalisé avec vos prix négociés",
                "Historique de commandes pour réapprovisionner en un clic",
                "Notifications automatiques à chaque étape",
              ],
            },
            {
              color: "green",
              bg: "rgba(16, 185, 129, 0.1)",
              number: "-30%",
              label: "de temps de livraison",
              tag: "🚛 Livraisons optimisées",
              title: "Des tournées intelligentes pour des livraisons à l'heure.",
              desc: "Notre technologie calcule les meilleures routes chaque matin. Vos produits arrivent frais et à l'heure, depuis le dépôt le plus proche de chez vous.",
              bullets: [
                `Livraison depuis ${DISTRAM_INFO.depots.join(", ")}`,
                "Suivi en temps réel de votre commande",
                "Créneaux de livraison flexibles",
              ],
              reverse: true,
            },
            {
              color: "blue",
              bg: "rgba(59, 130, 246, 0.1)",
              number: "30s",
              label: "pour trouver le bon produit",
              tag: "🤖 IA DISTRAM",
              title: "L'intelligence artificielle qui connaît vos besoins.",
              desc: "Décrivez votre menu ou prenez une photo — notre IA vous recommande exactement les produits DISTRAM adaptés à votre cuisine.",
              bullets: [
                "Recommandations personnalisées par IA",
                "Analyse de menus par photo",
                "Suggestions de réapprovisionnement intelligentes",
              ],
            },
          ].map((benefit, i) => (
            <Reveal key={i} className={cn("grid md:grid-cols-2 gap-16 items-center mb-20 pb-20 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0", benefit.reverse && "md:[direction:rtl]")}>
              <div
                className={cn("rounded-2xl p-12 min-h-[320px] flex items-center justify-center", benefit.reverse && "md:[direction:ltr]")}
                style={{ background: benefit.bg }}
              >
                <div className="text-center">
                  <div
                    className="text-7xl font-black leading-none"
                    style={{ color: benefit.color === "orange" ? DISTRAM_COLORS.primary : benefit.color === "green" ? DISTRAM_COLORS.success : DISTRAM_COLORS.info }}
                  >
                    {benefit.number}
                  </div>
                  <div
                    className="text-lg font-semibold mt-2"
                    style={{ color: benefit.color === "orange" ? DISTRAM_COLORS.primaryDark : benefit.color === "green" ? DISTRAM_COLORS.success : DISTRAM_COLORS.info }}
                  >
                    {benefit.label}
                  </div>
                </div>
              </div>
              <div className={cn(benefit.reverse && "md:[direction:ltr]")}>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold mb-4"
                  style={{
                    background: benefit.bg,
                    color: benefit.color === "orange" ? DISTRAM_COLORS.primary : benefit.color === "green" ? DISTRAM_COLORS.success : DISTRAM_COLORS.info
                  }}
                >
                  {benefit.tag}
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-4 leading-tight">{benefit.title}</h3>
                <p className="text-gray-500 leading-relaxed mb-6">{benefit.desc}</p>
                <ul className="space-y-3">
                  {benefit.bullets.map((bullet, j) => (
                    <li key={j} className="flex items-start gap-3 text-gray-700 text-sm">
                      <span style={{ color: DISTRAM_COLORS.success }} className="font-bold shrink-0 mt-0.5">✓</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== AI AGENTS ===================== */}
      <section id="ia" className="py-28 px-8 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: DISTRAM_COLORS.primary }}>L&apos;IA DISTRAM</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
              5 assistants intelligents à votre service
            </h2>
            <p className="text-gray-500 text-lg max-w-[600px] mx-auto">
              DISTRAM intègre l&apos;intelligence artificielle pour vous faire gagner du temps.
            </p>
          </Reveal>

          <Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  emoji: "🎯",
                  role: "Pour nos commerciaux",
                  title: "L'assistant de vente",
                  desc: "Il connaît le catalogue DISTRAM par cœur. Il analyse vos besoins et propose les bons produits aux bons prix.",
                  color: DISTRAM_COLORS.primary,
                },
                {
                  emoji: "📸",
                  role: "Pour la prospection",
                  title: "Le scanner de menus",
                  desc: "Une photo de votre menu, et en 30 secondes nous savons exactement quels produits DISTRAM vous correspondent.",
                  color: DISTRAM_COLORS.success,
                },
                {
                  emoji: "🛒",
                  role: "Pour vous, restaurateurs",
                  title: "L'aide à la commande",
                  desc: "Décrivez ce que vous cherchez, l'IA DISTRAM vous guide vers les bons produits. Simple et rapide.",
                  color: DISTRAM_COLORS.info,
                },
                {
                  emoji: "📊",
                  role: "Pour nos managers",
                  title: "L'analyste business",
                  desc: "Suivi des performances, analyse des ventes, prévisions — tout pour optimiser notre service.",
                  color: DISTRAM_COLORS.warning,
                },
                {
                  emoji: "🚛",
                  role: "Pour nos livreurs",
                  title: "Le copilote livraison",
                  desc: "Itinéraires optimisés, infos clients, alertes — nos chauffeurs ont tout pour livrer à l'heure.",
                  color: "#8B5CF6",
                },
              ].map((agent, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-8 hover:border-transparent hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: agent.color }} />
                  <div className="text-4xl mb-4">{agent.emoji}</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{agent.role}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{agent.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{agent.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== WHY DISTRAM ===================== */}
      <section className="py-28 px-8" style={{ background: DISTRAM_COLORS.black }}>
        <Reveal>
          <div className="max-w-[1100px] mx-auto text-center text-white">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: DISTRAM_COLORS.primary }}>Pourquoi DISTRAM ?</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-16">
              La différence DISTRAM
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: DISTRAM_INFO.experience, label: "d'expérience dans la distribution halal" },
                { number: `${DISTRAM_INFO.clients}+`, label: "restaurants nous font confiance" },
                { number: `${DISTRAM_INFO.commerciaux}`, label: "commerciaux à votre écoute" },
                { number: "100%", label: "produits halal certifiés" },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="text-4xl md:text-5xl font-black leading-none" style={{ color: DISTRAM_COLORS.primary }}>{item.number}</div>
                  <div className="text-white/70 text-sm mt-3 leading-relaxed">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== TESTIMONIAL ===================== */}
      <section className="py-28 px-8" style={{ background: `linear-gradient(135deg, rgba(245, 166, 35, 0.05) 0%, rgba(245, 166, 35, 0.15) 100%)` }}>
        <Reveal>
          <div className="max-w-[800px] mx-auto text-center">
            <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed italic relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-8xl opacity-20 leading-none" style={{ color: DISTRAM_COLORS.primary }}>&ldquo;</span>
              DISTRAM, c&apos;est la qualité et la régularité. Depuis 10 ans je travaille avec eux, jamais un problème de livraison, toujours des produits frais. Leur nouveau portail en ligne me fait gagner un temps fou — je commande le soir, je reçois le lendemain.
            </p>
            <div className="mt-8">
              <div className="font-bold text-gray-900">Mehdi K.</div>
              <div className="text-gray-500 text-sm">Gérant de 3 restaurants — Lyon</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== CONTACT CTA ===================== */}
      <section id="contact" className="py-28 px-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-center relative overflow-hidden">
        <div
          className="absolute -top-1/2 -right-1/5 w-3/5 h-[200%] pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(245, 166, 35, 0.15) 0%, transparent 60%)` }}
        />
        <Reveal>
          <div className="max-w-[1100px] mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 max-w-[700px] mx-auto">
              Rejoignez la famille <span style={{ color: DISTRAM_COLORS.primary }}>DISTRAM</span>
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-[500px] mx-auto">
              Contactez-nous dès maintenant pour devenir client ou demander un devis personnalisé.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={`tel:${DISTRAM_INFO.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 px-10 py-4 text-white font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all text-lg"
                style={{
                  background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)`,
                  boxShadow: `0 10px 30px -5px rgba(245, 166, 35, 0.4)`
                }}
              >
                📞 Appelez-nous : {DISTRAM_INFO.phone}
              </a>
              <a
                href={`mailto:${DISTRAM_INFO.email}`}
                className="inline-flex items-center gap-2 px-10 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all text-lg"
              >
                ✉️ {DISTRAM_INFO.email}
              </a>
            </div>
            <div className="mt-12">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              >
                Ou accédez directement à la plateforme →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-16 px-8" style={{ background: DISTRAM_COLORS.black }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                  style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
                >
                  D
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{DISTRAM_INFO.name}</div>
                  <div className="text-sm text-gray-400">{DISTRAM_INFO.slogan}</div>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                Le partenaire de confiance des professionnels de la restauration halal depuis 1993.
                Qualité, fiabilité, innovation.
              </p>
              <div className="flex gap-3">
                {DISTRAM_INFO.certifications.map((cert, i) => (
                  <span key={i} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                    {cert}
                  </span>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>📞 {DISTRAM_INFO.phone}</li>
                <li>✉️ {DISTRAM_INFO.email}</li>
                <li>🌐 {DISTRAM_INFO.website}</li>
              </ul>
            </div>

            {/* Dépôts */}
            <div>
              <h4 className="text-white font-bold mb-4">Nos dépôts</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                {DISTRAM_INFO.depots.map((depot, i) => (
                  <li key={i}>📍 {depot}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 {DISTRAM_INFO.name}. Tous droits réservés.
            </p>
            <p className="text-gray-600 text-xs">
              {FACE_MEDIA_INFO.role} <span className="text-gray-500">{FACE_MEDIA_INFO.name}</span>
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.8s ease forwards;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-gray-900">
            <div className="w-9 h-9 bg-[#FF6B2C] rounded-xl flex items-center justify-center text-white font-black text-lg">
              F
            </div>
            FASTGROSS PRO
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            <li><a href="#results" className="text-gray-600 font-medium hover:text-[#FF6B2C] transition-colors">Résultats</a></li>
            <li><a href="#how" className="text-gray-600 font-medium hover:text-[#FF6B2C] transition-colors">Comment ça marche</a></li>
            <li><a href="#ia" className="text-gray-600 font-medium hover:text-[#FF6B2C] transition-colors">L&apos;IA embarquée</a></li>
            <li><a href="#pricing" className="text-gray-600 font-medium hover:text-[#FF6B2C] transition-colors">Tarifs</a></li>
            <li>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B2C] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#E55A1F] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
              >
                Voir la démo
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="pt-40 pb-24 px-8 text-center relative overflow-hidden">
        <div className="absolute -top-1/2 -left-1/5 w-[140%] h-full bg-[radial-gradient(ellipse_at_center_top,rgba(255,107,44,0.07)_0%,transparent_60%)] pointer-events-none" />

        <div className="animate-fadeUp">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-orange-50 text-[#FF6B2C] rounded-full font-semibold text-sm mb-8">
            <span>⚡</span> Déjà adopté par des grossistes en France
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-gray-900 max-w-[850px] mx-auto mb-6 leading-tight animate-fadeUp animation-delay-100">
          Vos commerciaux vendent plus.
          <br />
          <span className="text-[#FF6B2C] relative">
            Sans effort supplémentaire.
            <span className="absolute bottom-0.5 left-0 right-0 h-1.5 bg-orange-200 rounded-full -z-10" />
          </span>
        </h1>

        <p className="text-xl text-gray-500 max-w-[620px] mx-auto mb-10 leading-relaxed animate-fadeUp animation-delay-200">
          La plateforme qui transforme vos commerciaux terrain en machines à vendre, optimise vos livraisons au kilomètre près, et laisse vos clients commander tout seuls.
        </p>

        <div className="flex gap-4 justify-center flex-wrap animate-fadeUp animation-delay-300">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B2C] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#E55A1F] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
          >
            Voir la démo en direct →
          </Link>
          <a
            href="#results"
            className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-gray-900 font-semibold rounded-xl border-2 border-gray-300 hover:border-[#FF6B2C] hover:text-[#FF6B2C] transition-all"
          >
            Découvrir les résultats
          </a>
        </div>

        <div className="flex justify-center gap-12 mt-16 pt-12 border-t border-gray-100 animate-fadeUp animation-delay-400">
          {[
            { number: "30", suffix: "sec", label: "Pour savoir quoi vendre\nà un nouveau restaurant" },
            { number: "3", suffix: "×", label: "Plus de visites\nproductives par jour" },
            { number: "0", suffix: "h", label: "Passées à planifier\nles tournées" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-extrabold text-gray-900">
                {stat.number}<span className="text-[#FF6B2C]">{stat.suffix}</span>
              </div>
              <div className="text-gray-500 text-sm mt-1 whitespace-pre-line">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== PROBLEM ===================== */}
      <section id="problem" className="py-24 px-8 bg-gray-900 text-white">
        <Reveal>
          <div className="max-w-[1100px] mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Le problème</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-12 leading-tight">
              Votre équipe perd du temps.
              <br />
              Beaucoup de temps.
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "🕐",
                  title: "Des visites commerciales qui traînent",
                  desc: "Votre commercial arrive chez un restaurateur. Il feuillette son catalogue, hésite, propose au hasard. Le rendez-vous dure 1h. Le restaurateur dit \"je réfléchis\".",
                },
                {
                  icon: "🗺️",
                  title: "Des livreurs qui tournent en rond",
                  desc: "Vos chauffeurs font leurs tournées \"à l'habitude\". Personne n'a optimisé les routes depuis des mois. Résultat : du gasoil brûlé, des retards, des clients mécontents.",
                },
                {
                  icon: "📞",
                  title: "Des commandes qui passent au téléphone",
                  desc: "Vos clients appellent, envoient des SMS, des WhatsApp. Les erreurs s'accumulent, les commandes se perdent, et votre équipe passe ses journées à décrocher.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-orange-500/30 transition-all"
                >
                  <div className="text-3xl mb-4">{card.icon}</div>
                  <h3 className="text-lg font-bold mb-3">{card.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== BEFORE / AFTER ===================== */}
      <section className="py-20 px-8 bg-gray-100">
        <Reveal>
          <div className="max-w-[900px] mx-auto grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            <div className="bg-white border border-gray-300 rounded-2xl p-10">
              <h3 className="text-sm uppercase tracking-widest font-bold text-gray-500 mb-6">Aujourd&apos;hui</h3>
              <ul className="space-y-4">
                {[
                  "1h par visite commerciale, résultat incertain",
                  "Catalogue papier ou PDF de 30 pages",
                  "Tournées planifiées au feeling",
                  "Commandes par téléphone et WhatsApp",
                  "Aucune vision en temps réel",
                  "Tout repose sur la mémoire de chacun",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 font-bold shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-3xl text-[#FF6B2C] md:rotate-0 rotate-90 text-center">→</div>

            <div className="bg-gray-900 text-white rounded-2xl p-10">
              <h3 className="text-sm uppercase tracking-widest font-bold text-[#FF6B2C] mb-6">Avec FASTGROSS PRO</h3>
              <ul className="space-y-4">
                {[
                  "30 secondes pour la bonne recommandation",
                  "L'IA analyse le menu et propose les bons produits",
                  "Routes optimisées automatiquement chaque matin",
                  "Portail en ligne : vos clients commandent seuls, 24h/24",
                  "Dashboard en temps réel par dépôt, par commercial",
                  "L'IA retient tout et s'améliore avec le temps",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== TRANSFORMATION ===================== */}
      <section id="results" className="py-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Les résultats concrets</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Ce que ça change au quotidien</h2>
            <p className="text-gray-500 text-lg max-w-[600px] mx-auto">
              Pas de la théorie. Des résultats visibles dès la première semaine.
            </p>
          </Reveal>

          {/* Benefit rows */}
          {[
            {
              color: "orange",
              bg: "bg-orange-50",
              number: "30s",
              label: "au lieu de 45 minutes",
              tag: "📸 Scan Menu IA",
              title: "Votre commercial photographie la carte. L'IA fait le reste.",
              desc: "Il entre dans un restaurant, prend en photo le menu affiché au mur. En 30 secondes, l'intelligence artificielle a analysé chaque plat et propose exactement les produits de votre catalogue qui correspondent.",
              bullets: [
                "Fini les \"je vais vérifier et je vous rappelle\"",
                "Recommandations personnalisées, pas un catalogue générique",
                "Le devis est prêt avant même que le café refroidisse",
              ],
            },
            {
              color: "green",
              bg: "bg-green-50",
              number: "-30%",
              label: "de kilomètres par jour",
              tag: "🚛 Routes intelligentes",
              title: "Vos livreurs font plus de livraisons en moins de temps.",
              desc: "Chaque matin, les tournées sont calculées automatiquement. Le bon ordre, les bonnes routes, les bonnes fenêtres horaires. Vos chauffeurs suivent l'itinéraire et livrent plus de clients dans la journée.",
              bullets: [
                "Moins de gasoil, moins de retards",
                "Multi-dépôts : Lyon, Montpellier, Bordeaux… tout est géré",
                "Les clients reçoivent leurs livraisons à l'heure",
              ],
              reverse: true,
            },
            {
              color: "blue",
              bg: "bg-blue-50",
              number: "24/7",
              label: "vos clients commandent seuls",
              tag: "🛒 Portail de commande",
              title: "Vos clients passent commande à 2h du matin. Vous dormez. Le CA tombe.",
              desc: "Un espace dédié pour chaque restaurant client. Il voit votre catalogue, vos prix, passe commande en 3 clics. Plus besoin d'appeler, d'envoyer un SMS ou d'attendre lundi matin.",
              bullets: [
                "Moins d'erreurs : le client choisit lui-même",
                "Historique de commandes : réappro en un clic",
                "Notifications automatiques à chaque étape",
              ],
            },
            {
              color: "amber",
              bg: "bg-amber-50",
              number: "100%",
              label: "de visibilité sur votre activité",
              tag: "📊 Vision complète",
              title: "Vous savez exactement où vous en êtes. À tout moment.",
              desc: "Chiffre d'affaires par dépôt, performance de chaque commercial, top clients, alertes sur les objectifs… tout est là, en temps réel, sans attendre le reporting de fin de mois.",
              bullets: [
                "Un dashboard par ville, par équipe, par commercial",
                "Alertes automatiques si un objectif décroche",
                "Demandez à l'IA : \"Comment va Montpellier ce mois-ci ?\"",
              ],
              reverse: true,
            },
          ].map((benefit, i) => (
            <Reveal key={i} className={cn("grid md:grid-cols-2 gap-16 items-center mb-20 pb-20 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0", benefit.reverse && "md:[direction:rtl]")}>
              <div className={cn(benefit.bg, "rounded-2xl p-12 min-h-[320px] flex items-center justify-center", benefit.reverse && "md:[direction:ltr]")}>
                <div className="text-center">
                  <div className={cn("text-7xl font-black leading-none", {
                    "text-[#FF6B2C]": benefit.color === "orange",
                    "text-green-500": benefit.color === "green",
                    "text-blue-500": benefit.color === "blue",
                    "text-amber-500": benefit.color === "amber",
                  })}>
                    {benefit.number}
                  </div>
                  <div className={cn("text-lg font-semibold mt-2", {
                    "text-[#FF6B2C]": benefit.color === "orange",
                    "text-green-600": benefit.color === "green",
                    "text-blue-600": benefit.color === "blue",
                    "text-amber-600": benefit.color === "amber",
                  })}>
                    {benefit.label}
                  </div>
                </div>
              </div>
              <div className={cn(benefit.reverse && "md:[direction:ltr]")}>
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold mb-4", {
                  "bg-orange-50 text-[#FF6B2C]": benefit.color === "orange",
                  "bg-green-50 text-green-600": benefit.color === "green",
                  "bg-blue-50 text-blue-600": benefit.color === "blue",
                  "bg-amber-50 text-amber-600": benefit.color === "amber",
                })}>
                  {benefit.tag}
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-4 leading-tight">{benefit.title}</h3>
                <p className="text-gray-500 leading-relaxed mb-6">{benefit.desc}</p>
                <ul className="space-y-3">
                  {benefit.bullets.map((bullet, j) => (
                    <li key={j} className="flex items-start gap-3 text-gray-700 text-sm">
                      <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="py-28 px-8 bg-gray-100">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Simple comme bonjour</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Prêt en 2 semaines. Pas en 6 mois.</h2>
            <p className="text-gray-500 text-lg">On s&apos;occupe de tout. Votre équipe n&apos;a rien à installer.</p>
          </Reveal>

          <Reveal>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  num: "1",
                  title: "On importe votre catalogue",
                  desc: "Vos produits, vos prix, vos références. On configure la plateforme avec vos données réelles. Pas de la démo, du concret.",
                },
                {
                  num: "2",
                  title: "Votre équipe se connecte",
                  desc: "Chacun son accès : les commerciaux sur le terrain depuis leur téléphone, les livreurs avec leur app, les managers sur leur dashboard.",
                },
                {
                  num: "3",
                  title: "L'IA apprend et s'améliore",
                  desc: "Plus vos commerciaux l'utilisent, plus les recommandations deviennent précises. L'IA retient les corrections et s'adapte à vos clients.",
                },
              ].map((step, i) => (
                <div key={i} className="bg-white rounded-2xl p-10 text-center hover:-translate-y-1 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF6B2C] text-white text-2xl font-extrabold flex items-center justify-center mx-auto mb-6">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== AI AGENTS ===================== */}
      <section id="ia" className="py-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">L&apos;intelligence embarquée</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">5 assistants IA qui travaillent pour vous</h2>
            <p className="text-gray-500 text-lg max-w-[600px] mx-auto">
              Ils ne dorment jamais, ne se trompent pas, et s&apos;améliorent chaque jour.
            </p>
          </Reveal>

          <Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  emoji: "🎯",
                  role: "Pour vos commerciaux",
                  title: "L'assistant de vente",
                  desc: "Il connaît votre catalogue par cœur. Il analyse le menu du restaurant, identifie les besoins, et propose les bons produits aux bons prix. Votre commercial n'a plus qu'à valider.",
                  color: "#FF6B2C",
                },
                {
                  emoji: "📸",
                  role: "Pour la prospection",
                  title: "Le scanner de menus",
                  desc: "Une photo du menu, et en 30 secondes vous savez exactement quoi proposer. Il détecte les viandes, les sauces, les fromages, les pains — et fait le lien avec vos produits.",
                  color: "#10B981",
                },
                {
                  emoji: "🛒",
                  role: "Pour vos clients restaurateurs",
                  title: "L'aide à la commande",
                  desc: "Vos clients tapent \"j'ai besoin de viande pour kebab\", et l'IA leur montre les bons produits. Elle suggère aussi des réapprovisionnements basés sur leurs commandes passées.",
                  color: "#3B82F6",
                },
                {
                  emoji: "📊",
                  role: "Pour vos managers",
                  title: "L'analyste business",
                  desc: "Posez-lui n'importe quelle question : \"Quel commercial a le meilleur taux de conversion ?\", \"Comment va le dépôt de Bordeaux ?\". Il répond en langage clair, avec des chiffres.",
                  color: "#F59E0B",
                },
                {
                  emoji: "🚛",
                  role: "Pour vos livreurs",
                  title: "Le copilote de livraison",
                  desc: "Infos client en un coup d'œil, alertes sur les livraisons urgentes, instructions spéciales. Vos chauffeurs ont tout ce qu'il faut sans décrocher le téléphone.",
                  color: "#8B5CF6",
                },
              ].map((agent, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl p-8 hover:border-transparent hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
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

      {/* ===================== ROI ===================== */}
      <section className="py-28 px-8 bg-gray-900 text-white text-center">
        <Reveal>
          <div className="max-w-[1100px] mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Le retour sur investissement</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Les chiffres parlent d&apos;eux-mêmes</h2>
            <p className="text-white/60 text-lg max-w-[500px] mx-auto mb-16">
              Calculé sur la base d&apos;un grossiste avec 300 clients restaurants et 8 commerciaux.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-[900px] mx-auto">
              {[
                { number: "×75", label: "Retour sur investissement moyen la première année" },
                { number: "+40%", label: "De chiffre d'affaires par commercial terrain" },
                { number: "-30%", label: "De kilomètres parcourus par livreur" },
                { number: "85%", label: "Des commandes passent en self-service en 6 mois" },
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="text-4xl md:text-5xl font-black text-[#FF6B2C] leading-none">{item.number}</div>
                  <div className="text-white/70 text-sm mt-2 leading-relaxed">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== TESTIMONIAL ===================== */}
      <section className="py-28 px-8 bg-orange-50">
        <Reveal>
          <div className="max-w-[800px] mx-auto text-center">
            <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed italic relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-8xl text-[#FF6B2C] opacity-20 leading-none">&ldquo;</span>
              Avant, mes commerciaux passaient une heure par visite à feuilleter un catalogue. Maintenant, ils prennent une photo du menu et en 30 secondes le devis est prêt. On a doublé le nombre de visites par jour.
            </p>
            <div className="mt-8">
              <div className="font-bold text-gray-900">Hamza B.</div>
              <div className="text-gray-500 text-sm">Directeur Général — Grossiste alimentaire halal, 300 restaurants</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== TARGETS ===================== */}
      <section className="py-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Pour qui ?</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900">Conçu pour les grossistes alimentaires</h2>
          </Reveal>

          <Reveal>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { emoji: "🥙", title: "Grossistes halal", desc: "Kebabs, burgers, pizzerias, tacos. Votre cœur de métier, notre spécialité." },
                { emoji: "🏪", title: "Distributeurs régionaux", desc: "Plusieurs dépôts, plusieurs villes. Une seule plateforme pour tout piloter." },
                { emoji: "📈", title: "Grossistes en croissance", desc: "Vous passez de 100 à 500 clients ? La plateforme grandit avec vous." },
              ].map((target, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl p-8 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="text-5xl mb-4">{target.emoji}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{target.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{target.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="py-28 px-8">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C] mb-4">Investissement</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Un prix clair. Un ROI immédiat.</h2>
            <p className="text-gray-500 text-lg">Pas de surprise, pas de frais cachés.</p>
          </Reveal>

          <Reveal>
            <div className="max-w-[580px] mx-auto bg-white border-2 border-[#FF6B2C] rounded-3xl p-12 relative overflow-hidden">
              <div className="absolute top-5 -right-9 bg-[#FF6B2C] text-white px-12 py-1.5 text-xs font-bold uppercase tracking-wider rotate-45">
                OFFRE PARTENAIRE
              </div>

              <div className="text-center mb-8 pb-8 border-b border-gray-100">
                <div className="text-2xl font-bold text-gray-900 mb-2">FASTGROSS PRO</div>
                <div className="text-gray-500 text-sm mb-6">Plateforme complète + 5 assistants IA + optimisation logistique</div>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-gray-900">9 900€</div>
                    <div className="text-gray-500 text-sm">Mise en place (une fois)</div>
                  </div>
                  <div className="text-gray-300 text-2xl hidden md:block">+</div>
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-gray-900">449€</div>
                    <div className="text-gray-500 text-sm">/ mois</div>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "5 assistants IA intégrés (vente, scan menu, commande, analyse, livraison)",
                  "Optimisation automatique des tournées de livraison",
                  "Portail de commande en ligne pour vos clients",
                  "Application commerciaux + livreurs + managers",
                  "Dashboard temps réel multi-dépôts",
                  "Catalogue produits illimité avec vos références",
                  "Notifications email + SMS automatiques",
                  "Import de vos données existantes inclus",
                  "Formation de votre équipe incluse",
                  "Support prioritaire",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 text-sm">
                    <span className="text-[#FF6B2C] font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="text-center">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-[#FF6B2C] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#E55A1F] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 transition-all text-lg"
                >
                  Demander une démo personnalisée →
                </Link>
                <p className="text-gray-500 text-xs mt-4">
                  Tous les prix sont HT. Engagement 12 mois. ROI moyen constaté : ×75.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="py-28 px-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-center relative overflow-hidden">
        <div className="absolute -top-1/2 -right-1/5 w-3/5 h-[200%] bg-[radial-gradient(circle,rgba(255,107,44,0.1)_0%,transparent_60%)] pointer-events-none" />
        <Reveal>
          <div className="max-w-[1100px] mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 max-w-[700px] mx-auto">
              Prêt à transformer votre façon de vendre ?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-[500px] mx-auto">
              Demandez une démo avec vos propres produits. En 15 minutes, vous verrez la différence.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#FF6B2C] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#E55A1F] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 transition-all text-lg"
            >
              Réserver ma démo →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-12 px-8 bg-gray-900 text-white/40 text-center text-sm border-t border-white/5">
        <div className="max-w-[1100px] mx-auto">
          <p>
            © 2026 FACE MEDIA — FASTGROSS PRO. Tous droits réservés. |{" "}
            <a href="#" className="text-white/60 hover:text-[#FF6B2C]">Mentions légales</a> |{" "}
            <a href="#" className="text-white/60 hover:text-[#FF6B2C]">CGV</a> |{" "}
            <a href="mailto:contact@facemedia.fr" className="text-white/60 hover:text-[#FF6B2C]">contact@facemedia.fr</a>
          </p>
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

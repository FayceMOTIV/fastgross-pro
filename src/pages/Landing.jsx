import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  ArrowRight,
  Scan,
  Mail,
  Radar,
  FileCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Clock,
  Shield,
  BarChart3,
  AlertCircle,
  X,
  MessageSquare,
  Globe,
  Lock,
  Headphones,
  Infinity,
  Building2,
  UserCircle,
  Quote,
} from 'lucide-react'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  const painPoints = [
    {
      icon: Clock,
      text: "Vous passez des heures à rédiger des emails qui finissent en spam"
    },
    {
      icon: AlertCircle,
      text: "Vos séquences génériques ont un taux de réponse de 2%"
    },
    {
      icon: Target,
      text: "Vous ne savez jamais quels prospects prioriser"
    },
    {
      icon: BarChart3,
      text: "Vos clients vous demandent des preuves de ROI"
    }
  ]

  const modules = [
    {
      icon: Scan,
      name: 'Scanner',
      tagline: 'Analysez en 30 secondes',
      description: "Entrez l'URL d'un client. L'IA scrape le site, identifie le positionnement, le persona idéal, les arguments clés et les objections. Vous obtenez un profil de prospection complet sans effort.",
      stat: '30 sec',
      statLabel: 'par analyse',
      cardHover: 'hover:border-brand-500/30',
      iconBg: 'bg-brand-500/10',
      iconBgHover: 'group-hover:bg-brand-500/20',
      iconColor: 'text-brand-400',
      statColor: 'text-brand-400',
      taglineColor: 'text-brand-400',
    },
    {
      icon: Mail,
      name: 'Forgeur',
      tagline: 'Des emails qui convertissent',
      description: "Générez des séquences de 4-6 emails personnalisés. Choisissez votre ton (Expert, Amical, Challenger, Storyteller). Chaque email est optimisé pour maximiser les ouvertures et les réponses.",
      stat: '4x',
      statLabel: 'plus de réponses',
      cardHover: 'hover:border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      iconBgHover: 'group-hover:bg-blue-500/20',
      iconColor: 'text-blue-400',
      statColor: 'text-blue-400',
      taglineColor: 'text-blue-400',
    },
    {
      icon: Radar,
      name: 'Radar',
      tagline: 'Priorisez intelligemment',
      description: "Chaque interaction est trackée et scorée. Ouvertures, clics, réponses. Le Radar vous montre exactement qui appeler en premier. Fini les heures perdues sur des leads froids.",
      stat: '10 min',
      statLabel: 'par jour suffisent',
      cardHover: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/10',
      iconBgHover: 'group-hover:bg-amber-500/20',
      iconColor: 'text-amber-400',
      statColor: 'text-amber-400',
      taglineColor: 'text-amber-400',
    },
    {
      icon: FileCheck,
      name: 'Proof',
      tagline: 'Prouvez votre valeur',
      description: "Générez des rapports de ROI automatiques pour vos clients. Emails envoyés, taux d'ouverture, rendez-vous obtenus, valeur générée. Plus jamais de discussion sur vos honoraires.",
      stat: '0',
      statLabel: 'justification nécessaire',
      cardHover: 'hover:border-purple-500/30',
      iconBg: 'bg-purple-500/10',
      iconBgHover: 'group-hover:bg-purple-500/20',
      iconColor: 'text-purple-400',
      statColor: 'text-purple-400',
      taglineColor: 'text-purple-400',
    },
  ]

  const steps = [
    {
      number: '1',
      title: 'Scannez',
      description: "Entrez l'URL du site de votre client. L'IA analyse tout en 30 secondes.",
      icon: Globe,
    },
    {
      number: '2',
      title: 'Forgez',
      description: "Générez une séquence email personnalisée avec le ton parfait.",
      icon: Sparkles,
    },
    {
      number: '3',
      title: 'Suivez',
      description: "Le Radar score vos leads automatiquement. Contactez les plus chauds.",
      icon: TrendingUp,
    },
  ]

  const testimonials = [
    {
      quote: "Face Media a transformé notre approche commerciale. On a signé 3 clients le premier mois.",
      author: "Marie L.",
      role: "Fondatrice",
      company: "Agence Digitale",
      avatar: "M",
    },
    {
      quote: "Le Scanner m'a fait gagner 2h par prospect. Et les emails générés sont meilleurs que les miens.",
      author: "Thomas R.",
      role: "Consultant Freelance",
      company: "",
      avatar: "T",
    },
    {
      quote: "Mes clients adorent les rapports Proof. Plus personne ne discute mes factures.",
      author: "Sophie M.",
      role: "Directrice Commerciale",
      company: "Scale Agency",
      avatar: "S",
    },
  ]

  const plans = [
    {
      name: 'Solo',
      price: 79,
      description: 'Pour les freelances et consultants',
      popular: false,
      features: [
        '1 client actif',
        '200 emails/mois',
        'Scanner illimité',
        'Séquences IA (4 tons)',
        'Radar basique',
        'Support email',
      ],
      cta: 'Commencer',
      ctaStyle: 'secondary',
    },
    {
      name: 'Pro',
      price: 199,
      description: 'Pour les petites agences',
      popular: true,
      features: [
        '5 clients actifs',
        '1 000 emails/mois',
        'Tout Solo +',
        'Rapports Proof',
        'Radar avancé (Kanban)',
        'Import de leads CSV',
        'Support prioritaire',
      ],
      cta: 'Essai gratuit 14j',
      ctaStyle: 'primary',
    },
    {
      name: 'Agency',
      price: 499,
      description: 'Pour les agences établies',
      popular: false,
      features: [
        'Clients illimités',
        '5 000 emails/mois',
        'Tout Pro +',
        'White label',
        'API access',
        'Multi-utilisateurs',
        'Account manager dédié',
      ],
      cta: 'Nous contacter',
      ctaStyle: 'secondary',
    },
  ]

  const faqs = [
    {
      question: "Est-ce que ça marche vraiment ?",
      answer: "Nos utilisateurs constatent en moyenne 4x plus de réponses qu'avec des emails manuels. L'IA personnalise chaque message en fonction du prospect et de son entreprise."
    },
    {
      question: "Comment fonctionne le Scanner ?",
      answer: "Vous entrez l'URL du site de votre client. Notre IA analyse le contenu, identifie le positionnement, le persona cible, les arguments de vente et les objections potentielles. En 30 secondes, vous avez un profil complet."
    },
    {
      question: "Les emails passent-ils en spam ?",
      answer: "Nous utilisons les meilleures pratiques de délivrabilité. Vous connectez votre propre domaine email, ce qui garantit une réputation optimale. Nos séquences sont conçues pour ressembler à des emails humains, pas à du marketing automatisé."
    },
    {
      question: "Puis-je modifier les emails générés ?",
      answer: "Absolument. L'IA génère une base que vous pouvez éditer à votre guise. Vous gardez le contrôle total sur ce qui est envoyé."
    },
    {
      question: "Comment fonctionne le scoring des leads ?",
      answer: "Chaque interaction est trackée : ouverture (+1 point), clic (+3 points), réponse (+10 points). Le Radar classe automatiquement vos leads du plus chaud au plus froid."
    },
    {
      question: "Puis-je utiliser Face Media pour mes clients ?",
      answer: "C'est exactement pour ça qu'on l'a créé. Le plan Agency inclut le white label — vos clients ne verront jamais notre marque."
    },
    {
      question: "Y a-t-il un engagement ?",
      answer: "Non. Tous nos plans sont sans engagement. Vous pouvez annuler à tout moment depuis les paramètres."
    },
    {
      question: "Comment sont protégées mes données ?",
      answer: "Vos données sont hébergées en Europe (Firebase EU), chiffrées au repos et en transit. Nous sommes conformes RGPD. Vous pouvez exporter ou supprimer vos données à tout moment."
    },
  ]

  const footerLinks = {
    product: [
      { label: 'Scanner', href: '#modules' },
      { label: 'Forgeur', href: '#modules' },
      { label: 'Radar', href: '#modules' },
      { label: 'Proof', href: '#modules' },
      { label: 'Pricing', href: '#pricing' },
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Status', href: '#' },
    ],
    company: [
      { label: 'À propos', href: '#' },
      { label: 'Contact', href: 'mailto:contact@facemediafactory.com' },
      { label: 'Carrières', href: '#' },
    ],
    legal: [
      { label: 'CGV', href: '/legal?tab=cgv' },
      { label: 'Confidentialité', href: '/legal?tab=privacy' },
      { label: 'Mentions légales', href: '/legal?tab=mentions' },
    ],
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <span className="font-display font-bold text-white">Face Media</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#modules" className="text-sm text-dark-300 hover:text-white transition-colors">Modules</a>
              <a href="#how-it-works" className="text-sm text-dark-300 hover:text-white transition-colors">Comment ça marche</a>
              <a href="#pricing" className="text-sm text-dark-300 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-dark-300 hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-dark-300 hover:text-white transition-colors">
                Connexion
              </Link>
              <Link to="/signup" className="btn-primary text-sm">
                Démarrer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm text-brand-400">Propulsé par l'IA Claude</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-6">
              Transformez votre prospection
              <br />
              <span className="gradient-text">en machine à leads</span>
            </h1>

            <p className="text-lg sm:text-xl text-dark-300 max-w-3xl mx-auto mb-10">
              L'IA analyse vos clients, génère des emails personnalisés et identifie vos meilleurs prospects. <span className="text-white font-medium">Automatiquement.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="btn-secondary text-base px-8 py-3 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Voir la démo
              </button>
            </div>

            <p className="mt-6 text-sm text-dark-500">
              Essai gratuit 14 jours • Sans carte bancaire • Annulez quand vous voulez
            </p>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-card p-2 rounded-2xl border-brand-500/20 overflow-hidden">
              <div className="bg-dark-900 rounded-xl p-6 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-brand-400" />
                  </div>
                  <p className="text-dark-400 text-sm">Capture d'écran du dashboard</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              La prospection manuelle, <span className="text-red-400">c'est fini.</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Vous reconnaissez ces problèmes ? Vous n'êtes pas seul.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {painPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 rounded-xl bg-red-500/5 border border-red-500/10"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <point.icon className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-dark-200 pt-2">{point.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-dark-300">
              Et si vous pouviez automatiser tout ça avec l'IA ?
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-brand-400">
              <ArrowRight className="w-5 h-5 animate-bounce" />
              <span className="font-medium">Découvrez nos 4 modules</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              4 modules, <span className="gradient-text">1 seul objectif</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Chaque module est conçu pour résoudre un problème précis de votre prospection.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module, index) => (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-8 ${module.cardHover} transition-all group`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${module.iconBg} flex items-center justify-center ${module.iconBgHover} transition-colors`}>
                    <module.icon className={`w-7 h-7 ${module.iconColor}`} />
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-display font-bold ${module.statColor}`}>{module.stat}</p>
                    <p className="text-xs text-dark-500">{module.statLabel}</p>
                  </div>
                </div>

                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {module.name}
                </h3>
                <p className={`text-sm ${module.taglineColor} mb-4`}>{module.tagline}</p>
                <p className="text-dark-300 text-sm leading-relaxed">
                  {module.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              3 étapes simples pour transformer votre prospection.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center relative"
              >
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-brand-500/50 to-transparent" />
                )}

                <div className="w-24 h-24 mx-auto rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6 relative">
                  <step.icon className="w-10 h-10 text-brand-400" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-sm font-bold text-dark-950">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-display font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-dark-400 text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Ils automatisent leur prospection
            </h2>
            <p className="text-dark-400">
              Utilisé par <span className="text-brand-400 font-medium">50+ agences et freelances</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-brand-500/20 mb-2" />

                <p className="text-dark-200 mb-6 italic">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-dark-950">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.author}</p>
                    <p className="text-xs text-dark-500">
                      {testimonial.role}{testimonial.company && ` @ ${testimonial.company}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Un prix simple, <span className="gradient-text">transparent</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Choisissez le plan adapté à votre activité. Sans engagement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-8 relative ${plan.popular ? 'border-brand-500/50 ring-1 ring-brand-500/20' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-500 text-xs font-bold text-dark-950">
                    POPULAIRE
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-display font-semibold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-dark-500">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-display font-bold text-white">{plan.price}€</span>
                  <span className="text-dark-500">/mois</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-dark-300">
                      <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                    plan.ctaStyle === 'primary'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-dark-500">
            Besoin d'un plan personnalisé ?{' '}
            <a href="mailto:contact@facemediafactory.com" className="text-brand-400 hover:underline">
              Contactez-nous
            </a>
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Questions fréquentes
            </h2>
            <p className="text-dark-400">
              Tout ce que vous devez savoir avant de commencer.
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/30 transition-colors"
                >
                  <span className="font-medium text-white pr-4">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-brand-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-500 flex-shrink-0" />
                  )}
                </button>

                {openFaq === index && (
                  <div className="px-5 pb-5">
                    <p className="text-dark-300 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-transparent"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Prêt à transformer votre prospection ?
            </h2>
            <p className="text-dark-300 mb-8 max-w-2xl mx-auto">
              Rejoignez les 50+ agences et freelances qui génèrent des leads qualifiés en automatique.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-sm text-dark-500">
              14 jours d'essai • Sans carte bancaire
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-dark-950" />
                </div>
                <span className="font-display font-bold text-white">Face Media</span>
              </Link>
              <p className="text-sm text-dark-500">
                La prospection intelligente propulsée par l'IA.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-medium text-white mb-4">Produit</h4>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-dark-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-medium text-white mb-4">Ressources</h4>
              <ul className="space-y-2">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-dark-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-medium text-white mb-4">Entreprise</h4>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-dark-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-medium text-white mb-4">Légal</h4>
              <ul className="space-y-2">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-dark-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-dark-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-dark-500">
              © 2025 Face Media Factory. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <Shield className="w-4 h-4 text-dark-600" />
              <span className="text-xs text-dark-600">Hébergé en Europe • RGPD Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

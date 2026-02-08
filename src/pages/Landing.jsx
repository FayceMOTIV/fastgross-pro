import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Zap,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Play,
  Mail,
  Smartphone,
  MessageCircle,
  Mic,
  Send,
  Menu,
  X,
  TrendingUp,
  Users,
  BarChart3,
  Heart,
} from 'lucide-react'

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

// Animated section wrapper
function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay } },
      }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// Channel data
const channels = [
  {
    icon: Mail,
    name: 'Email',
    desc: 'Sequences personnalisees avec IA',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    icon: Smartphone,
    name: 'SMS',
    desc: '98% de taux d\'ouverture',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    icon: MessageCircle,
    name: 'WhatsApp',
    desc: 'Conversations directes',
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-50',
    text: 'text-green-600',
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z" />
      </svg>
    ),
    name: 'Instagram',
    desc: 'DM et engagement social',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
  },
  {
    icon: Mic,
    name: 'Voicemail',
    desc: 'Message vocal personnalise',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
  {
    icon: Send,
    name: 'Courrier',
    desc: 'Lettres avec QR code trackable',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
]

// Steps data
const steps = [
  {
    num: '01',
    title: 'Connectez votre site',
    desc: 'Importez votre base prospects ou laissez l\'IA les trouver pour vous.',
  },
  {
    num: '02',
    title: 'Importez vos prospects',
    desc: 'CSV, CRM, ou recherche automatique selon votre cible ideale.',
  },
  {
    num: '03',
    title: 'L\'IA cree vos sequences',
    desc: 'Messages personnalises adaptes a chaque prospect et canal.',
  },
  {
    num: '04',
    title: 'Recoltez les RDV',
    desc: 'Notifications en temps reel. Vous ne faites que closer.',
  },
]

// Pricing data
const plans = [
  {
    name: 'Bootstrap',
    price: 33,
    desc: 'Pour demarrer',
    features: ['200 emails/mois', '2 canaux actifs', '1 sequence', 'Support email'],
    cta: 'Commencer',
    popular: false,
  },
  {
    name: 'Growth',
    price: 50,
    desc: 'Le plus populaire',
    features: [
      '1 000 emails/mois',
      '6 canaux actifs',
      '5 sequences',
      'Multi-contact entreprise',
      'Support prioritaire',
    ],
    cta: 'Essai gratuit 14j',
    popular: true,
  },
  {
    name: 'Scale',
    price: 73,
    desc: 'Pour les pros',
    features: [
      '5 000 emails/mois',
      '6 canaux actifs',
      'Sequences illimitees',
      'API access',
      'Account manager',
    ],
    cta: 'Nous contacter',
    popular: false,
  },
]

// Testimonials data
const testimonials = [
  {
    quote:
      'En 2 semaines, j\'ai signe 3 nouveaux clients. L\'IA fait vraiment le travail de prospection a ma place.',
    name: 'Marie Dupont',
    role: 'Consultante Marketing',
    avatar: 'MD',
  },
  {
    quote:
      'Le multicanal a tout change. Mes prospects repondent 3x plus qu\'avant avec les emails seuls.',
    name: 'Thomas Bernard',
    role: 'Agence Web',
    avatar: 'TB',
  },
  {
    quote:
      'Simple, efficace, et le ROI est la des le premier mois. Je recommande a tous les freelances.',
    name: 'Sophie Martin',
    role: 'Designer UX',
    avatar: 'SM',
  },
]

// FAQ data
const faqs = [
  {
    q: 'Comment l\'IA trouve-t-elle des prospects ?',
    a: 'L\'IA recherche sur Google, annuaires pro, et reseaux sociaux. Elle extrait les emails depuis les sites web et enrichit avec Hunter.io.',
  },
  {
    q: 'Est-ce que mes emails passent en spam ?',
    a: 'Non. Vous connectez votre propre adresse. L\'IA envoie depuis votre compte avec des delais humains.',
  },
  {
    q: 'Puis-je personnaliser les messages ?',
    a: 'Absolument. L\'IA genere une base personnalisee, mais vous gardez le controle total sur chaque message.',
  },
  {
    q: 'C\'est legal (RGPD) ?',
    a: 'Oui. Emails pro publics uniquement, lien desabonnement inclus, serveurs en Europe.',
  },
]

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  // Handle scroll for nav background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* ============================================
          NAVIGATION
          ============================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-xl shadow-soft-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-accent-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-text text-lg">
                Face<span className="gradient-text">Media</span>Factory
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#channels" className="text-sm text-text-secondary hover:text-accent transition-colors">
                Canaux
              </a>
              <a href="#how" className="text-sm text-text-secondary hover:text-accent transition-colors">
                Comment ca marche
              </a>
              <a href="#pricing" className="text-sm text-text-secondary hover:text-accent transition-colors">
                Tarifs
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="text-sm text-text-secondary hover:text-accent transition-colors px-4 py-2">
                Connexion
              </Link>
              <Link to="/signup" className="btn-primary text-sm px-5 py-2.5">
                Commencer gratuitement
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden py-4 border-t border-accent/10"
            >
              <div className="flex flex-col gap-2">
                <a href="#channels" className="px-4 py-2 text-text-secondary hover:text-accent">
                  Canaux
                </a>
                <a href="#how" className="px-4 py-2 text-text-secondary hover:text-accent">
                  Comment ca marche
                </a>
                <a href="#pricing" className="px-4 py-2 text-text-secondary hover:text-accent">
                  Tarifs
                </a>
                <div className="border-t border-accent/10 mt-2 pt-2 flex flex-col gap-2">
                  <Link to="/login" className="px-4 py-2 text-text-secondary">
                    Connexion
                  </Link>
                  <Link to="/signup" className="btn-primary mx-4 text-center">
                    Commencer gratuitement
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient with orbs */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-200/10 rounded-full blur-[150px] animate-float-slow" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              {/* Badge */}
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-accent/10 shadow-soft-sm mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium text-text-secondary">
                  Prospection IA nouvelle generation
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-text leading-[1.1] tracking-tight mb-6"
              >
                Vos prospects,{' '}
                <span className="gradient-text">6 canaux</span>,{' '}
                <br className="hidden sm:block" />
                zero effort.
              </motion.h1>

              {/* Subtitle */}
              <motion.p variants={fadeUp} className="text-lg text-text-secondary max-w-xl mb-8">
                L'IA prospecte pour vous 24/7 sur Email, SMS, WhatsApp, Instagram, Vocal et Courrier.
                Vous ne faites que closer.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-10">
                <Link
                  to="/signup"
                  className="btn-primary text-base px-8 py-4 flex items-center gap-2"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/app?demo=true"
                  className="btn-secondary text-base px-8 py-4 flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Voir la demo
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-8">
                <div>
                  <p className="text-3xl font-display font-bold text-text">6</p>
                  <p className="text-sm text-text-muted">canaux actifs</p>
                </div>
                <div>
                  <p className="text-3xl font-display font-bold text-text">3x</p>
                  <p className="text-sm text-text-muted">plus de reponses</p>
                </div>
                <div>
                  <p className="text-3xl font-display font-bold gradient-text">73€</p>
                  <p className="text-sm text-text-muted">/mois seulement</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              {/* Main card */}
              <div className="bg-white rounded-3xl shadow-soft-xl p-6 border border-accent/5">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-surface-hover rounded-2xl p-4">
                    <p className="text-2xl font-display font-bold text-text">127</p>
                    <p className="text-xs text-text-muted">Prospects actifs</p>
                  </div>
                  <div className="bg-surface-hover rounded-2xl p-4">
                    <p className="text-2xl font-display font-bold text-success">34%</p>
                    <p className="text-xs text-text-muted">Taux reponse</p>
                  </div>
                  <div className="bg-surface-hover rounded-2xl p-4">
                    <p className="text-2xl font-display font-bold text-accent">12</p>
                    <p className="text-xs text-text-muted">RDV ce mois</p>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="h-40 bg-gradient-to-r from-accent/5 to-purple-100/50 rounded-2xl flex items-end justify-around p-4">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="w-8 bg-gradient-accent rounded-t-lg transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating notification cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-soft-lg p-4 border border-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">Nouvelle reponse</p>
                    <p className="text-xs text-text-muted">Jean Dupont - il y a 2min</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-8 bg-white rounded-2xl shadow-soft-lg p-4 border border-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">+23% ce mois</p>
                    <p className="text-xs text-text-muted">Taux de conversion</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          CHANNELS SECTION
          ============================================ */}
      <AnimatedSection id="channels" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text mb-4">
              <span className="gradient-text">6 canaux</span> pour toucher vos prospects
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              L'IA orchestre automatiquement vos contacts. Quand un prospect repond, tout s'arrete.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel, i) => (
              <motion.div
                key={channel.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-3xl p-6 shadow-soft-sm border border-accent/5 hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
              >
                {/* Top gradient bar on hover */}
                <div
                  className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${channel.gradient} rounded-full transition-all duration-300 mb-6`}
                />

                <div className={`w-14 h-14 rounded-2xl ${channel.bg} flex items-center justify-center mb-4`}>
                  <channel.icon className={`w-7 h-7 ${channel.text}`} />
                </div>

                <h3 className="text-xl font-display font-semibold text-text mb-2">{channel.name}</h3>
                <p className="text-text-secondary">{channel.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          HOW IT WORKS SECTION
          ============================================ */}
      <AnimatedSection id="how" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text mb-4">
              Comment ca marche ?
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              4 etapes simples. L'IA fait le travail, vous recoltez les clients.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-gradient-to-r from-accent/20 to-accent/5" />
                )}

                <div className="text-center">
                  {/* Number circle */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-accent text-white font-display font-bold text-xl flex items-center justify-center mx-auto mb-6 shadow-accent-glow">
                    {step.num}
                  </div>

                  <h3 className="text-lg font-display font-semibold text-text mb-2">{step.title}</h3>
                  <p className="text-text-secondary text-sm">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          PRICING SECTION
          ============================================ */}
      <AnimatedSection id="pricing" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text mb-4">
              Tarifs simples, <span className="gradient-text">transparents</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Sans engagement. Annulez quand vous voulez.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-3xl p-8 ${
                  plan.popular
                    ? 'shadow-soft-xl border-2 border-accent ring-4 ring-accent/10'
                    : 'shadow-soft-sm border border-accent/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-accent text-white text-sm font-semibold shadow-accent-glow">
                    POPULAIRE
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-display font-semibold text-text">{plan.name}</h3>
                  <p className="text-text-muted text-sm">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-display font-bold text-text">{plan.price}</span>
                  <span className="text-text-muted">€/mois</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-text-secondary">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                    plan.popular ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          TESTIMONIALS SECTION
          ============================================ */}
      <AnimatedSection className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text mb-4">
              Ils nous font confiance
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-muted rounded-3xl p-8"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-text-secondary italic mb-6">"{t.quote}"</p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center text-white font-semibold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-text">{t.name}</p>
                    <p className="text-sm text-text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          FAQ SECTION
          ============================================ */}
      <AnimatedSection className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-text mb-4">
              Questions frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-accent/5 overflow-hidden shadow-soft-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-hover transition-colors"
                >
                  <span className="font-medium text-text">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-accent flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="px-5 pb-5"
                  >
                    <p className="text-text-secondary">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          FINAL CTA SECTION
          ============================================ */}
      <AnimatedSection className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-hero rounded-4xl p-12 lg:p-16 text-center overflow-hidden">
            {/* Background orbs */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-accent/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-pink-300/10 rounded-full blur-[100px]" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text mb-4">
                Pret a automatiser votre prospection ?
              </h2>
              <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
                Rejoignez des centaines d'entrepreneurs qui gagnent du temps chaque jour.
              </p>
              <Link
                to="/signup"
                className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="mt-4 text-sm text-text-muted">14 jours d'essai - Sans carte bancaire</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-text">FaceMediaFactory</span>
              </div>
              <p className="text-sm text-text-muted">
                Prospection IA multicanale pour entrepreneurs.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-text mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#channels" className="hover:text-accent">Canaux</a></li>
                <li><a href="#how" className="hover:text-accent">Comment ca marche</a></li>
                <li><a href="#pricing" className="hover:text-accent">Tarifs</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-text mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-accent">Blog</a></li>
                <li><a href="#" className="hover:text-accent">Documentation</a></li>
                <li><a href="#" className="hover:text-accent">Support</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-text mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link to="/legal?tab=cgv" className="hover:text-accent">CGV</Link></li>
                <li><Link to="/legal?tab=privacy" className="hover:text-accent">Confidentialite</Link></li>
                <li><Link to="/legal?tab=mentions" className="hover:text-accent">Mentions legales</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-accent/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              © 2026 Face Media Factory. Tous droits reserves.
            </p>
            <p className="text-sm text-text-muted flex items-center gap-1">
              Fait avec <Heart className="w-4 h-4 text-danger fill-danger" /> en France
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

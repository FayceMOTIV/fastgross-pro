import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  ArrowRight,
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
  MessageSquare,
  Building2,
  Briefcase,
  Wrench,
  Stethoscope,
  Store,
  Code,
  Mail,
  Bell,
  CheckCircle,
  Quote,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
} from 'lucide-react'

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  const targetAudience = [
    { icon: Building2, name: 'Agences', desc: 'Marketing, web, communication...' },
    { icon: Briefcase, name: 'Consultants', desc: 'Coaching, conseil, formation...' },
    { icon: Wrench, name: 'Artisans', desc: 'Plombiers, electriciens, BTP...' },
    { icon: Stethoscope, name: 'Professions liberales', desc: 'Avocats, comptables, medecins...' },
    { icon: Store, name: 'Commerces', desc: 'Restaurants, salons, boutiques...' },
    { icon: Code, name: 'Freelances', desc: 'Developpeurs, designers, redacteurs...' },
  ]

  const steps = [
    {
      number: '1',
      title: 'Repondez a 5 questions',
      description: "L'IA comprend votre activite, votre cible et votre zone geographique.",
      icon: MessageSquare,
    },
    {
      number: '2',
      title: "L'IA construit votre strategie",
      description: "Plan d'action sur 1, 3 ou 6 mois avec projections de resultats.",
      icon: Target,
    },
    {
      number: '3',
      title: "L'IA prospecte 24/7",
      description: "Elle trouve des prospects, envoie des emails personnalises, et suit chaque interaction.",
      icon: Mail,
    },
    {
      number: '4',
      title: 'Vous recevez vos leads chauds',
      description: 'Chaque matin : "Vous avez X personnes a contacter." Vous appelez, vous closez.',
      icon: Bell,
    },
  ]

  const plans = [
    {
      name: 'Starter',
      price: 49,
      description: 'Pour demarrer',
      popular: false,
      features: [
        '200 emails/mois',
        '1 sequence active',
        '3 emails/sequence',
        'Support email',
      ],
      cta: 'Commencer',
      ctaStyle: 'secondary',
    },
    {
      name: 'Pro',
      price: 99,
      description: 'Le plus populaire',
      popular: true,
      features: [
        '1 000 emails/mois',
        '5 sequences actives',
        '5 emails/sequence',
        'Multi-contact par entreprise',
        'Support prioritaire',
      ],
      cta: 'Essai gratuit 14j',
      ctaStyle: 'primary',
    },
    {
      name: 'Scale',
      price: 199,
      description: 'Pour les pros',
      popular: false,
      features: [
        '5 000 emails/mois',
        'Sequences illimitees',
        '7 emails/sequence',
        'Multi-contact par entreprise',
        'Account manager dedie',
        'API access',
      ],
      cta: 'Nous contacter',
      ctaStyle: 'secondary',
    },
  ]

  const faqs = [
    {
      question: "Comment l'IA trouve-t-elle des prospects ?",
      answer: "L'IA recherche des entreprises correspondant a votre cible sur Google, les annuaires professionnels et les reseaux sociaux. Elle extrait les emails depuis les sites web, Google Maps, et des APIs d'enrichissement comme Hunter.io."
    },
    {
      question: "Est-ce que mes emails passent en spam ?",
      answer: "Non. Vous connectez votre propre adresse email (Gmail, Outlook ou SMTP). L'IA envoie les emails depuis votre compte avec des delais aleatoires pour imiter un envoi humain. Vos emails arrivent dans la boite principale."
    },
    {
      question: "Puis-je personnaliser les emails ?",
      answer: "Absolument. L'IA genere une base personnalisee pour chaque prospect, mais vous gardez le controle total. Vous pouvez modifier chaque email avant envoi ou laisser l'IA gerer automatiquement."
    },
    {
      question: "Que se passe-t-il quand un prospect repond ?",
      answer: "L'IA stoppe immediatement la sequence et vous notifie. Vous voyez la reponse dans votre dashboard et pouvez repondre directement. Si vous contactez plusieurs personnes dans la meme entreprise, toutes les sequences s'arretent."
    },
    {
      question: "C'est legal (RGPD) ?",
      answer: "Oui. Nous ne collectons que des emails professionnels publics. Chaque email inclut un lien de desabonnement. Vous pouvez exporter ou supprimer vos donnees a tout moment. Nos serveurs sont en Europe."
    },
    {
      question: "Y a-t-il un engagement ?",
      answer: "Non. Tous nos plans sont sans engagement. Vous pouvez annuler a tout moment depuis les parametres de votre compte."
    },
    {
      question: "Combien de temps avant les premiers resultats ?",
      answer: "Les premiers emails sont envoyes des le premier jour. Les premieres reponses arrivent generalement dans les 48-72h. La plupart de nos utilisateurs signent leur premier client dans les 2 semaines."
    },
    {
      question: "Puis-je utiliser Face Media pour mon agence ?",
      answer: "Oui ! Le plan Scale inclut le multi-utilisateurs et l'API. Vous pouvez gerer la prospection de tous vos clients depuis un seul compte."
    },
  ]

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
              <span className="font-display font-bold text-white">Face Media Factory</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm text-dark-300 hover:text-white transition-colors">Comment ca marche</a>
              <a href="#pricing" className="text-sm text-dark-300 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-dark-300 hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-dark-300 hover:text-white transition-colors">
                Connexion
              </Link>
              <Link to="/signup" className="btn-primary text-sm">
                Demarrer
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-6">
              Trouvez vos prochains clients.
              <br />
              <span className="gradient-text">L'IA prospecte pour vous.</span>
            </h1>

            <p className="text-lg sm:text-xl text-dark-300 max-w-3xl mx-auto mb-4">
              Dites-nous qui vous cherchez. L'IA trouve des prospects,
              leur envoie des emails personnalises, et vous previent
              quand ils repondent.
            </p>
            <p className="text-xl sm:text-2xl font-display font-semibold text-white mb-10">
              Vous n'avez qu'a closer.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/app?demo=true" className="btn-secondary text-base px-8 py-3 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Voir la demo
              </Link>
            </div>

            <p className="mt-6 text-sm text-dark-500">
              Essai gratuit 14 jours - Sans carte bancaire - Sans engagement
            </p>
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-brand-400">4x</p>
              <p className="text-sm text-dark-400 mt-1">plus de reponses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-brand-400">10 min</p>
              <p className="text-sm text-dark-400 mt-1">par jour suffisent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-brand-400">0</p>
              <p className="text-sm text-dark-400 mt-1">competences requises</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Face Media Factory s'adapte a <span className="gradient-text">VOTRE</span> business
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Quel que soit votre secteur, l'IA comprend votre activite et trouve vos clients ideaux.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {targetAudience.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-5 text-center hover:border-brand-500/30 transition-all"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                  <item.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="font-medium text-white mb-1">{item.name}</h3>
                <p className="text-xs text-dark-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Comment ca marche ?
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              4 etapes simples. L'IA fait le travail, vous recoltez les clients.
            </p>
          </motion.div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="glass-card p-6 flex items-start gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-display font-bold text-brand-400">{step.number}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-display font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-dark-400">
                    {step.description}
                  </p>
                </div>
                <div className="hidden md:flex w-12 h-12 rounded-xl bg-dark-800 items-center justify-center">
                  <step.icon className="w-6 h-6 text-dark-400" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Morning Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16"
          >
            <div className="glass-card p-8 border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-400">Chaque matin, vous voyez :</p>
                </div>
              </div>

              <div className="bg-dark-900/50 rounded-xl p-6 border border-dark-800">
                <p className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
                  Vous avez <span className="text-brand-400">10 personnes</span> a contacter aujourd'hui
                </p>
                <p className="text-dark-400">
                  7 ont repondu a vos emails • 3 ont ouvert plusieurs fois (interesses)
                </p>
                <button className="mt-4 btn-primary text-sm">
                  Voir les prospects chauds
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Multichannel Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm text-brand-400">Nouveau : Prospection Multicanale</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              5 canaux. <span className="gradient-text">1 seule reponse suffit.</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              L'IA orchestre automatiquement vos contacts sur plusieurs canaux.
              Quand un prospect repond sur n'importe quel canal, tout s'arrete.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            {[
              { icon: Mail, name: 'Email', desc: 'Canal principal', color: 'emerald', stats: '5 max' },
              { icon: Smartphone, name: 'SMS', desc: '98% taux ouverture', color: 'blue', stats: '2 max' },
              { icon: Instagram, name: 'Instagram', desc: 'Approche sociale', color: 'pink', stats: '1 max' },
              { icon: Mic, name: 'Vocal', desc: 'Voicemail drop', color: 'purple', stats: '1 max' },
              { icon: MapPin, name: 'Courrier', desc: 'Premium avec QR', color: 'amber', stats: '1 max' },
            ].map((channel, index) => (
              <motion.div
                key={channel.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-5 text-center hover:border-${channel.color}-500/30 transition-all`}
              >
                <div className={`w-12 h-12 mx-auto rounded-xl bg-${channel.color}-500/10 flex items-center justify-center mb-3`}>
                  <channel.icon className={`w-6 h-6 text-${channel.color}-400`} />
                </div>
                <h3 className="font-medium text-white mb-1">{channel.name}</h3>
                <p className="text-xs text-dark-500 mb-2">{channel.desc}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${channel.color}-500/10 text-${channel.color}-400`}>
                  {channel.stats}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Sequence Example */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8"
          >
            <h3 className="text-xl font-display font-semibold text-white mb-6 text-center">
              Exemple de sequence multicanale (5 etapes)
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 overflow-x-auto pb-4">
              {[
                { day: 'J+0', channel: 'Email', icon: Mail, color: 'emerald', label: 'Accroche' },
                { day: 'J+3', channel: 'SMS', icon: Smartphone, color: 'blue', label: 'Relance courte' },
                { day: 'J+7', channel: 'Instagram', icon: Instagram, color: 'pink', label: 'Approche sociale' },
                { day: 'J+12', channel: 'Email', icon: Mail, color: 'emerald', label: 'Cas client' },
                { day: 'J+20', channel: 'Vocal', icon: Mic, color: 'purple', label: 'Touche humaine' },
              ].map((step, index, arr) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-dark-500 mb-2">{step.day}</span>
                    <div className={`w-12 h-12 rounded-xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center`}>
                      <step.icon className={`w-5 h-5 text-${step.color}-400`} />
                    </div>
                    <span className="text-xs text-dark-400 mt-2">{step.channel}</span>
                    <span className="text-xs text-dark-500">{step.label}</span>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-dark-600 hidden md:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-center">
              <p className="text-brand-400 font-medium">
                STOP GLOBAL : des qu'un prospect repond sur n'importe quel canal, toutes les sequences s'arretent automatiquement
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
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
              Choisissez le plan adapte a votre volume. Sans engagement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    RECOMMANDE
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
              Questions frequentes
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
              Pret a trouver vos prochains clients ?
            </h2>
            <p className="text-dark-300 mb-8 max-w-2xl mx-auto">
              Repondez a 5 questions. L'IA fait le reste.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-sm text-dark-500">
              14 jours d'essai - Sans carte bancaire
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <span className="font-display font-bold text-white">Face Media Factory</span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="/legal?tab=cgv" className="text-sm text-dark-400 hover:text-white transition-colors">CGV</Link>
              <Link to="/legal?tab=privacy" className="text-sm text-dark-400 hover:text-white transition-colors">Confidentialite</Link>
              <Link to="/legal?tab=mentions" className="text-sm text-dark-400 hover:text-white transition-colors">Mentions legales</Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-dark-500">
              <Shield className="w-4 h-4" />
              <span>Heberge en Europe - RGPD Compliant</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-dark-800/50 text-center">
            <p className="text-sm text-dark-500">
              © 2026 Face Media Factory. Tous droits reserves.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

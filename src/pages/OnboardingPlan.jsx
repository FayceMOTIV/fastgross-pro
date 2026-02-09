import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  Mail,
  Star,
  Loader2,
  Crown,
  Rocket,
  Building,
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    description: 'Pour demarrer',
    icon: Rocket,
    prospects: 500,
    emails: 1000,
    features: [
      '500 prospects/mois',
      '1000 emails/mois',
      'Canal email',
      'Templates IA',
    ],
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/25',
    ring: 'ring-blue-500/50',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 297,
    popular: true,
    description: 'Le plus populaire',
    icon: Crown,
    prospects: 2500,
    emails: 5000,
    features: [
      '2500 prospects/mois',
      '5000 emails/mois',
      'Email + SMS + WhatsApp',
      'Sequences auto',
      'A/B testing',
    ],
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-purple-500/25',
    ring: 'ring-purple-500/50',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 697,
    description: 'Pour les equipes',
    icon: Building,
    prospects: 10000,
    emails: 20000,
    features: [
      '10000 prospects/mois',
      '20000 emails/mois',
      'Tous les canaux',
      'API & webhooks',
      'Manager dedie',
    ],
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-orange-500/25',
    ring: 'ring-orange-500/50',
  },
]

export default function OnboardingPlan() {
  const { data, completeStep2, goBack } = useOnboardingFlow()
  const { isDemo } = useDemo()

  const [selectedPlan, setSelectedPlan] = useState(data.selectedPlan || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContinue = () => {
    if (!selectedPlan) return
    setIsSubmitting(true)
    completeStep2(selectedPlan)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg">Face Media Factory</h1>
                <p className="text-sm text-white/60">Etape 2 sur 3 - Votre forfait</p>
              </div>
            </div>
            {isDemo && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25">
                Demo
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full"
              initial={{ width: '33%' }}
              animate={{ width: '66%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
              Choisissez votre forfait
            </h2>
            <p className="text-white/60 text-lg">
              Selectionnez le forfait adapte a vos ambitions
            </p>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PLANS.map((plan, index) => {
              const isSelected = selectedPlan === plan.id
              const Icon = plan.icon

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative cursor-pointer group`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-purple-500/30">
                        <Star className="w-4 h-4" />
                        Populaire
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div className={`relative h-full bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 transition-all overflow-hidden ${
                    isSelected
                      ? `border-white/40 ring-4 ${plan.ring}`
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4"
                      >
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg ${plan.shadow}`}>
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </motion.div>
                    )}

                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 shadow-lg ${plan.shadow} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Plan info */}
                      <h3 className="text-xl font-display font-bold text-white mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-white/60 text-sm mb-4">{plan.description}</p>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-display font-bold text-white">
                          {plan.price}€
                        </span>
                        <span className="text-white/50">/mois</span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-white/60" />
                            <span className="text-xs text-white/50">Prospects</span>
                          </div>
                          <p className="text-lg font-bold text-white">
                            {plan.prospects.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-white/60" />
                            <span className="text-xs text-white/50">Emails</span>
                          </div>
                          <p className="text-lg font-bold text-white">
                            {plan.emails.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm text-white/80">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={goBack}
              className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              disabled={!selectedPlan || isSubmitting}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-white/40 text-sm mt-6"
          >
            14 jours d'essai gratuit. Sans engagement.
          </motion.p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Paiement securise
          </span>
          <span>Annulation a tout moment</span>
        </div>
      </footer>
    </div>
  )
}

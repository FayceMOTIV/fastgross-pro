import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  Mail,
  MessageSquare,
  Star,
  Loader2,
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    description: 'Pour demarrer votre prospection',
    prospects: 500,
    emails: 1000,
    features: [
      '500 prospects/mois',
      '1000 emails/mois',
      'Canal email uniquement',
      'Templates IA',
      'Support email',
    ],
    color: 'blue',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 297,
    popular: true,
    description: 'Pour accelerer votre croissance',
    prospects: 2500,
    emails: 5000,
    features: [
      '2500 prospects/mois',
      '5000 emails/mois',
      'Email + SMS + WhatsApp',
      'Sequences automatisees',
      'A/B testing',
      'Support prioritaire',
    ],
    color: 'brand',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 697,
    description: 'Pour les equipes ambitieuses',
    prospects: 10000,
    emails: 20000,
    features: [
      '10000 prospects/mois',
      '20000 emails/mois',
      'Tous les canaux',
      'API & webhooks',
      'Account manager dedie',
      'Formation incluse',
    ],
    color: 'purple',
  },
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    ring: 'ring-blue-500/50',
  },
  brand: {
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/30',
    text: 'text-brand-400',
    ring: 'ring-brand-500/50',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    ring: 'ring-purple-500/50',
  },
}

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
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white">Face Media Factory</h1>
                <p className="text-xs text-dark-500">Etape 2 sur 3 - Votre forfait</p>
              </div>
            </div>
            {isDemo && (
              <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Mode demo
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
              initial={{ width: '33%' }}
              animate={{ width: '66%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              Choisissez votre forfait
            </h2>
            <p className="text-dark-400 max-w-lg mx-auto">
              Selectionnez le forfait adapte a vos besoins. Vous pourrez le modifier a tout moment.
            </p>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PLANS.map((plan, index) => {
              const colors = colorClasses[plan.color]
              const isSelected = selectedPlan === plan.id

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative glass-card p-6 cursor-pointer transition-all ${
                    isSelected
                      ? `${colors.border} ring-2 ${colors.ring}`
                      : 'hover:border-dark-600'
                  }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500 text-dark-950 text-xs font-semibold">
                        <Star className="w-3 h-3" />
                        Recommande
                      </div>
                    </div>
                  )}

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute top-4 right-4 w-6 h-6 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center`}
                    >
                      <Check className={`w-4 h-4 ${colors.text}`} />
                    </motion.div>
                  )}

                  {/* Plan name */}
                  <h3 className="text-lg font-display font-bold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-dark-400 mb-4">{plan.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-display font-bold text-white">
                      {plan.price}€
                    </span>
                    <span className="text-dark-500">/mois</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className={`w-4 h-4 ${colors.text}`} />
                        <span className="text-xs text-dark-400">Prospects</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {plan.prospects.toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className={`w-4 h-4 ${colors.text}`} />
                        <span className="text-xs text-dark-400">Emails</span>
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
                        <Check className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                        <span className="text-sm text-dark-300">{feature}</span>
                      </div>
                    ))}
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
            <button
              onClick={goBack}
              className="btn-secondary flex items-center gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedPlan || isSubmitting}
              className="btn-primary flex items-center gap-2 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>

          {/* Note */}
          <p className="text-center text-dark-500 text-sm mt-6">
            Essai gratuit de 14 jours. Sans engagement.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-6 text-xs text-dark-500">
          <span>Paiement securise</span>
          <span className="w-1 h-1 rounded-full bg-dark-700" />
          <span>Annulation a tout moment</span>
        </div>
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  Target,
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  Check,
  ArrowRight,
  Sparkles,
  Calendar,
  Star,
} from 'lucide-react'
import { useDemo } from '@/contexts/DemoContext'

const PLANS = [
  {
    id: 'starter',
    name: 'Demarrage',
    duration: '1 mois',
    description: 'Ideal pour tester et obtenir vos premiers resultats',
    prospects: 200,
    emailsPerSequence: 3,
    estimatedResponses: 24,
    estimatedClients: 6,
    conversionRate: '3%',
    price: 49,
    features: [
      '200 prospects qualifies',
      '3 emails par sequence',
      'Suivi temps reel',
      'Support email',
    ],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
  },
  {
    id: 'growth',
    name: 'Croissance',
    duration: '3 mois',
    description: 'Pour accelerer votre acquisition client',
    prospects: 600,
    emailsPerSequence: 5,
    estimatedResponses: 90,
    estimatedClients: 25,
    conversionRate: '4.2%',
    price: 99,
    popular: true,
    features: [
      '600 prospects qualifies',
      '5 emails par sequence',
      'Suivi temps reel',
      'A/B testing automatique',
      'Support prioritaire',
    ],
    color: 'from-brand-400 to-brand-600',
    bgColor: 'bg-brand-500/10',
    borderColor: 'border-brand-500/30',
    textColor: 'text-brand-400',
  },
  {
    id: 'scale',
    name: 'Scale',
    duration: '6 mois',
    description: 'Pour une croissance maximale et durable',
    prospects: 1500,
    emailsPerSequence: 7,
    estimatedResponses: 270,
    estimatedClients: 70,
    conversionRate: '4.7%',
    price: 199,
    features: [
      '1500 prospects qualifies',
      '7 emails par sequence',
      'Suivi temps reel',
      'A/B testing automatique',
      'Multi-sources (LinkedIn, Google)',
      'Account manager dedie',
    ],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
  },
]

export default function OnboardingPlan() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan.id)
  }

  const handleContinue = () => {
    if (!selectedPlan) return

    setIsLoading(true)
    // Simulate saving
    setTimeout(() => {
      navigate('/onboarding/sequence')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white">Face Media Factory</h1>
              <p className="text-xs text-dark-500">Choisissez votre plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <div className="w-2 h-2 rounded-full bg-dark-700" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-sm text-brand-400">Plan genere par IA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Votre plan de prospection personnalise
          </h1>
          <p className="text-dark-400 max-w-2xl mx-auto">
            Base sur votre profil, voici les 3 strategies que nous vous recommandons. Choisissez
            celle qui correspond le mieux a vos objectifs.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectPlan(plan)}
              className={`relative glass-card p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? `${plan.borderColor} ring-2 ring-offset-2 ring-offset-dark-950 ${plan.borderColor.replace('border-', 'ring-')}`
                  : 'hover:border-dark-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500 text-dark-950 text-xs font-semibold">
                    <Star className="w-3 h-3" />
                    Recommande
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${plan.bgColor} mb-4`}
                >
                  <Calendar className="w-3 h-3" />
                  <span className={`text-xs font-medium ${plan.textColor}`}>{plan.duration}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-dark-400">{plan.description}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-3 rounded-xl ${plan.bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className={`w-4 h-4 ${plan.textColor}`} />
                    <span className="text-xs text-dark-400">Prospects</span>
                  </div>
                  <p className="text-xl font-bold text-white">{plan.prospects}</p>
                </div>
                <div className={`p-3 rounded-xl ${plan.bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className={`w-4 h-4 ${plan.textColor}`} />
                    <span className="text-xs text-dark-400">Emails/seq.</span>
                  </div>
                  <p className="text-xl font-bold text-white">{plan.emailsPerSequence}</p>
                </div>
                <div className={`p-3 rounded-xl ${plan.bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className={`w-4 h-4 ${plan.textColor}`} />
                    <span className="text-xs text-dark-400">Reponses</span>
                  </div>
                  <p className="text-xl font-bold text-white">~{plan.estimatedResponses}</p>
                </div>
                <div className={`p-3 rounded-xl ${plan.bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className={`w-4 h-4 ${plan.textColor}`} />
                    <span className="text-xs text-dark-400">Clients</span>
                  </div>
                  <p className="text-xl font-bold text-white">~{plan.estimatedClients}</p>
                </div>
              </div>

              {/* Conversion Rate */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl ${plan.bgColor} mb-6`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${plan.textColor}`} />
                  <span className="text-sm text-dark-300">Taux de conversion estime</span>
                </div>
                <span className={`font-bold ${plan.textColor}`}>{plan.conversionRate}</span>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${plan.textColor}`} />
                    <span className="text-sm text-dark-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="pt-6 border-t border-dark-700">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-display font-bold text-white">{plan.price}€</span>
                  <span className="text-dark-400">/mois</span>
                </div>
              </div>

              {/* Selection indicator */}
              {selectedPlan === plan.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={handleContinue}
            disabled={!selectedPlan || isLoading}
            className="btn-primary flex items-center gap-2 px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                Continuer avec ce plan
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-dark-500 text-sm mt-4">
            Vous pourrez modifier votre plan a tout moment
          </p>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-8 border-t border-dark-800/50"
        >
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-1">2,847</div>
              <div className="text-sm text-dark-400">Campagnes lancees</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">89%</div>
              <div className="text-sm text-dark-400">Taux de delivrabilite</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">12.4%</div>
              <div className="text-sm text-dark-400">Taux de reponse moyen</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">4.8/5</div>
              <div className="text-sm text-dark-400">Note moyenne</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Building2,
  Target,
  Briefcase,
  Users,
  Rocket,
  Sparkles,
  Loader2,
  Globe,
  Instagram,
  Linkedin,
  AtSign,
  TrendingUp,
  DollarSign,
  Clock,
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const STEPS = [
  {
    id: 'businessName',
    title: 'Votre entreprise',
    question: 'Quel est le nom de votre entreprise ?',
    placeholder: 'Ex: Mon Agence, Dupont Consulting...',
    icon: Building2,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/20 to-purple-600/20',
  },
  {
    id: 'sector',
    title: 'Votre secteur',
    question: "Dans quel secteur exercez-vous ?",
    placeholder: 'Ex: Marketing digital, Plomberie, Coaching...',
    suggestions: ['Agence marketing', 'Consultant', 'Artisan', 'E-commerce', 'SaaS', 'Formation'],
    icon: Briefcase,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'offer',
    title: 'Votre offre',
    question: 'Quelle est votre offre principale et son prix moyen ?',
    placeholder: 'Ex: Coaching business a 2000€, Sites web a partir de 3000€...',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    id: 'website',
    title: 'Votre site web',
    question: 'Avez-vous un site web ? Si oui, quelle est l\'URL ?',
    placeholder: 'Ex: https://monsite.com (ou "non" si pas de site)',
    icon: Globe,
    gradient: 'from-indigo-500 to-blue-500',
    bgGradient: 'from-indigo-500/20 to-blue-500/20',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    question: 'Quel est votre profil ou page LinkedIn ?',
    placeholder: 'Ex: https://linkedin.com/in/monprofil (ou "non")',
    icon: Linkedin,
    gradient: 'from-blue-600 to-blue-700',
    bgGradient: 'from-blue-600/20 to-blue-700/20',
  },
  {
    id: 'instagram',
    title: 'Instagram',
    question: 'Avez-vous un compte Instagram professionnel ?',
    placeholder: 'Ex: @moncompte (ou "non")',
    icon: Instagram,
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-500/20 to-rose-500/20',
  },
  {
    id: 'target',
    title: 'Votre cible',
    question: 'Decrivez votre client ideal (secteur, taille, poste)',
    placeholder: 'Ex: Dirigeants de PME 10-50 salaries dans le BTP',
    icon: Users,
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-500/20 to-amber-500/20',
  },
  {
    id: 'zone',
    title: 'Zone geographique',
    question: 'Dans quelle zone souhaitez-vous prospecter ?',
    placeholder: 'Ex: Paris, Ile-de-France, Toute la France...',
    suggestions: ['Paris', 'Lyon', 'Ile-de-France', 'France entiere', 'Europe', 'International'],
    icon: MapPin,
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-500/20 to-orange-500/20',
  },
  {
    id: 'volume',
    title: 'Volume souhaite',
    question: 'Combien de nouveaux clients souhaitez-vous par mois ?',
    type: 'choice',
    choices: [
      { id: '1-5', label: '1 a 5 clients', icon: Users, gradient: 'from-emerald-500 to-teal-500' },
      { id: '5-15', label: '5 a 15 clients', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500' },
      { id: '15-30', label: '15 a 30 clients', icon: Rocket, gradient: 'from-violet-500 to-purple-500' },
      { id: '30+', label: '30+ clients', icon: Sparkles, gradient: 'from-amber-500 to-orange-500' },
    ],
    icon: Target,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'urgency',
    title: 'Votre urgence',
    question: 'Quand souhaitez-vous demarrer votre prospection ?',
    type: 'choice',
    choices: [
      { id: 'asap', label: 'Des maintenant', icon: Zap, gradient: 'from-red-500 to-rose-500' },
      { id: 'week', label: 'Cette semaine', icon: Clock, gradient: 'from-orange-500 to-amber-500' },
      { id: 'month', label: 'Ce mois-ci', icon: Target, gradient: 'from-blue-500 to-cyan-500' },
      { id: 'exploring', label: 'Je decouvre', icon: Sparkles, gradient: 'from-violet-500 to-purple-500' },
    ],
    icon: Clock,
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-500/20 to-pink-600/20',
  },
]

const VOLUME_LABELS = {
  '1-5': '1 a 5 clients/mois',
  '5-15': '5 a 15 clients/mois',
  '15-30': '15 a 30 clients/mois',
  '30+': '30+ clients/mois',
}

const URGENCY_LABELS = {
  'asap': 'Des maintenant',
  'week': 'Cette semaine',
  'month': 'Ce mois-ci',
  'exploring': 'Je decouvre',
}

export default function OnboardingChat() {
  const { data, completeStep1 } = useOnboardingFlow()
  const { isDemo } = useDemo()

  const [currentStep, setCurrentStep] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [answers, setAnswers] = useState({
    businessName: data.businessName || '',
    sector: data.sector || '',
    offer: data.offer || '',
    website: data.website || '',
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    target: data.target || '',
    zone: data.zone || '',
    volume: data.volume || '',
    urgency: data.urgency || '',
  })
  const [showSummary, setShowSummary] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  useEffect(() => {
    if (step && answers[step.id]) {
      setInputValue(answers[step.id])
    } else {
      setInputValue('')
    }
  }, [currentStep, step])

  useEffect(() => {
    if (step?.type !== 'choice') {
      inputRef.current?.focus()
    }
  }, [currentStep, step])

  const handleNext = () => {
    // Validate input for text steps
    if (step?.type !== 'choice' && !inputValue.trim()) {
      return
    }

    // Validate that a choice was made for choice steps
    if (step?.type === 'choice' && !answers[step.id]) {
      return
    }

    const newAnswers = { ...answers, [step.id]: inputValue.trim() }
    setAnswers(newAnswers)

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleChoiceClick = (choiceId) => {
    const newAnswers = { ...answers, [step.id]: choiceId }
    setAnswers(newAnswers)

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion)
    inputRef.current?.focus()
  }

  const handleConfirm = () => {
    setIsSubmitting(true)
    completeStep1(answers)
  }

  const handleModify = () => {
    setShowSummary(false)
    setCurrentStep(0)
  }

  const getDisplayValue = (item) => {
    const value = answers[item.id]
    if (!value) return '-'
    if (item.id === 'volume') return VOLUME_LABELS[value] || value
    if (item.id === 'urgency') return URGENCY_LABELS[value] || value
    return value
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg">Face Media Factory</h1>
                <p className="text-sm text-white/60">Etape 1 sur 3 - Analyse de votre business</p>
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
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Question {currentStep + 1} sur {STEPS.length}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {!showSummary ? (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Question Card */}
                <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                  {/* Gradient glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${step?.bgGradient} rounded-3xl opacity-50`} />

                  <div className="relative">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step?.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                      {step && <step.icon className="w-8 h-8 text-white" />}
                    </div>

                    {/* Question */}
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                      {step?.question}
                    </h2>
                    <p className="text-white/60 text-sm mb-8">
                      {step?.title}
                    </p>

                    {/* Input or Choices */}
                    {step?.type === 'choice' ? (
                      <div className="grid grid-cols-2 gap-4">
                        {step.choices.map((choice) => (
                          <motion.button
                            key={choice.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleChoiceClick(choice.id)}
                            className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 text-left hover:bg-white/10 hover:border-white/20 transition-all"
                          >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${choice.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                              <choice.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-sm font-medium text-white">{choice.label}</p>
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* Suggestions */}
                        {step?.suggestions && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {step.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2 rounded-full text-sm bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Text Input */}
                        <div className="flex gap-3">
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                            placeholder={step?.placeholder}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNext}
                            disabled={!inputValue.trim()}
                            className="px-6 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-purple-500/30 transition-all"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </>
                    )}

                    {/* Back Button */}
                    {currentStep > 0 && (
                      <button
                        onClick={handleBack}
                        className="mt-6 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Question precedente
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {/* Summary Card */}
                <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl overflow-hidden">
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-pink-500/20" />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display font-bold text-white">
                          Analyse complete
                        </h2>
                        <p className="text-white/60">Verifiez votre profil</p>
                      </div>
                    </div>

                    {/* Summary Items - Scrollable */}
                    <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                      {STEPS.map((item, index) => {
                        const Icon = item.icon
                        const value = getDisplayValue(item)

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/50">{item.title}</p>
                              <p className="text-sm text-white font-medium truncate">{value}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleModify}
                        className="flex-1 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Modifier
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-1 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyse IA...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generer ma strategie
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Donnees securisees
          </span>
          <span>Analyse IA personnalisee</span>
        </div>
      </footer>
    </div>
  )
}

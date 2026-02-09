import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Send,
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
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const STEPS = [
  {
    id: 'sector',
    title: 'Votre secteur',
    question: "Quel est votre secteur d'activite ?",
    placeholder: 'Ex: Consultant marketing, Plombier, Agence web...',
    suggestions: ['Agence marketing', 'Consultant', 'Artisan', 'Commerce', 'Freelance'],
    icon: Building2,
  },
  {
    id: 'offer',
    title: 'Votre offre',
    question: 'Decrivez votre offre principale en quelques mots.',
    placeholder: 'Ex: Coaching business pour entrepreneurs',
    icon: Briefcase,
  },
  {
    id: 'target',
    title: 'Votre cible',
    question: 'Qui sont vos clients ideaux ?',
    placeholder: 'Ex: PME de 10-50 salaries dans le BTP',
    icon: Users,
  },
  {
    id: 'zone',
    title: 'Votre zone',
    question: 'Dans quelle zone geographique souhaitez-vous prospecter ?',
    placeholder: 'Ex: Paris, Lyon, Toute la France...',
    suggestions: ['Paris', 'Lyon', 'Marseille', 'Ile-de-France', 'Toute la France'],
    icon: MapPin,
  },
  {
    id: 'objective',
    title: 'Votre objectif',
    question: 'Quel est votre objectif principal ?',
    type: 'choice',
    choices: [
      { id: 'first_clients', label: 'Trouver mes premiers clients', icon: Rocket },
      { id: 'scale', label: 'Augmenter mon volume de clients', icon: Target },
      { id: 'new_offer', label: 'Lancer une nouvelle offre', icon: Sparkles },
      { id: 'new_market', label: 'Tester un nouveau marche', icon: MapPin },
    ],
    icon: Target,
  },
]

const OBJECTIVE_LABELS = {
  first_clients: 'Trouver mes premiers clients',
  scale: 'Augmenter mon volume de clients',
  new_offer: 'Lancer une nouvelle offre',
  new_market: 'Tester un nouveau marche',
}

export default function OnboardingChat() {
  const { data, updateData, completeStep1 } = useOnboardingFlow()
  const { isDemo } = useDemo()

  const [currentStep, setCurrentStep] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [answers, setAnswers] = useState({
    sector: data.sector || '',
    offer: data.offer || '',
    target: data.target || '',
    zone: data.zone || '',
    objective: data.objective || '',
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
    if (!inputValue.trim() && step?.type !== 'choice') return

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
    const newAnswers = { ...answers, objective: choiceId }
    setAnswers(newAnswers)
    setShowSummary(true)
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

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white">Face Media Factory</h1>
                <p className="text-xs text-dark-500">Etape 1 sur 3 - Votre profil</p>
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
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {!showSummary ? (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Question Card */}
                <div className="glass-card p-8">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6">
                    {step && <step.icon className="w-7 h-7 text-brand-400" />}
                  </div>

                  {/* Question */}
                  <h2 className="text-xl font-display font-bold text-white mb-2">
                    {step?.question}
                  </h2>
                  <p className="text-dark-400 text-sm mb-6">
                    Question {currentStep + 1} sur {STEPS.length}
                  </p>

                  {/* Input or Choices */}
                  {step?.type === 'choice' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {step.choices.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoiceClick(choice.id)}
                          className="glass-card p-4 text-left hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
                            <choice.icon className="w-5 h-5 text-brand-400" />
                          </div>
                          <p className="text-sm font-medium text-white">{choice.label}</p>
                        </button>
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
                              className="px-3 py-1.5 rounded-full text-xs bg-dark-800 text-dark-300 hover:bg-brand-500/20 hover:text-brand-400 transition-colors"
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
                          className="input-field flex-1"
                        />
                        <button
                          onClick={handleNext}
                          disabled={!inputValue.trim()}
                          className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Back Button */}
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="mt-6 flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Question precedente
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* Summary Card */}
                <div className="glass-card p-8 border-brand-500/30">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                      <Check className="w-7 h-7 text-dark-950" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-white">
                        Votre profil de prospection
                      </h2>
                      <p className="text-dark-400 text-sm">Verifiez que tout est correct</p>
                    </div>
                  </div>

                  {/* Summary Items */}
                  <div className="space-y-4 mb-8">
                    {STEPS.map((item) => {
                      const Icon = item.icon
                      const value = item.id === 'objective'
                        ? OBJECTIVE_LABELS[answers[item.id]]
                        : answers[item.id]

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 p-4 rounded-xl bg-dark-800/30"
                        >
                          <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-brand-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-dark-500 mb-1">{item.title}</p>
                            <p className="text-white font-medium truncate">{value || '-'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleModify}
                      className="btn-secondary flex-1"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Modifier
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
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
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-6 text-xs text-dark-500">
          <span>Vos donnees sont securisees</span>
          <span className="w-1 h-1 rounded-full bg-dark-700" />
          <span>Configuration en 2 min</span>
        </div>
      </footer>
    </div>
  )
}

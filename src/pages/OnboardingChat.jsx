import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Send,
  Loader2,
  ArrowRight,
  Check,
  MapPin,
  Building2,
  Target,
  Briefcase,
  Users,
  Rocket,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemo } from '@/hooks/useDemo'

const QUESTIONS = [
  {
    id: 'welcome',
    type: 'message',
    content: "Bienvenue sur Face Media Factory ! Je suis votre assistant IA de prospection. Je vais vous poser quelques questions pour comprendre votre activite et construire votre strategie de prospection sur-mesure.",
  },
  {
    id: 'sector',
    type: 'question',
    content: "Commencez : quel est votre secteur d'activite ?",
    placeholder: 'Ex: Consultant marketing, Plombier, Agence web...',
    suggestions: ['Agence marketing', 'Consultant', 'Artisan', 'Commerce', 'Freelance', 'Autre...'],
    icon: Building2,
  },
  {
    id: 'offer',
    type: 'question',
    content: "Parfait ! Decrivez votre offre principale en quelques mots.",
    placeholder: "Ex: Je fais du coaching business pour entrepreneurs",
    icon: Briefcase,
  },
  {
    id: 'target',
    type: 'question',
    content: "Super, je comprends bien votre offre. Maintenant, qui sont vos clients ideaux ?",
    placeholder: "Ex: PME de 10-50 salaries dans le BTP",
    icon: Users,
  },
  {
    id: 'zone',
    type: 'question',
    content: "Et dans quelle zone geographique souhaitez-vous prospecter ?",
    placeholder: 'Ex: Paris, Lyon, Ile-de-France, Toute la France...',
    suggestions: ['Paris', 'Lyon', 'Marseille', 'Ile-de-France', 'Toute la France'],
    icon: MapPin,
  },
  {
    id: 'objective',
    type: 'choice',
    content: "Derniere question : quel est votre objectif principal ?",
    choices: [
      { id: 'first_clients', label: 'Trouver mes premiers clients', icon: Rocket },
      { id: 'scale', label: 'Augmenter mon nombre de clients', icon: Target },
      { id: 'new_offer', label: 'Lancer une nouvelle offre', icon: Sparkles },
      { id: 'new_market', label: 'Tester un nouveau marche', icon: MapPin },
    ],
    icon: Target,
  },
]

export default function OnboardingChat() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()
  const [currentStep, setCurrentStep] = useState(0)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [answers, setAnswers] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Start the conversation
    if (messages.length === 0) {
      simulateAIMessage(QUESTIONS[0].content, () => {
        setTimeout(() => {
          addAIMessage(QUESTIONS[1].content)
          setCurrentStep(1)
        }, 500)
      })
    }
  }, [])

  const simulateAIMessage = (content, callback) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      addAIMessage(content)
      if (callback) callback()
    }, 1000 + Math.random() * 500)
  }

  const addAIMessage = (content) => {
    setMessages(prev => [...prev, { type: 'ai', content }])
  }

  const addUserMessage = (content) => {
    setMessages(prev => [...prev, { type: 'user', content }])
  }

  const handleSend = () => {
    if (!inputValue.trim()) return

    const currentQuestion = QUESTIONS[currentStep]
    addUserMessage(inputValue)
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: inputValue }))
    setInputValue('')

    // Move to next question
    const nextStep = currentStep + 1
    if (nextStep < QUESTIONS.length) {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const nextQuestion = QUESTIONS[nextStep]
        if (nextQuestion.type === 'message') {
          addAIMessage(nextQuestion.content)
          // Auto-advance to next question after message
          setTimeout(() => {
            setCurrentStep(nextStep + 1)
            addAIMessage(QUESTIONS[nextStep + 1].content)
          }, 500)
        } else {
          addAIMessage(nextQuestion.content)
          setCurrentStep(nextStep)
        }
      }, 800)
    } else {
      // Show summary
      setTimeout(() => {
        setShowSummary(true)
      }, 500)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleChoiceClick = (choice) => {
    const currentQuestion = QUESTIONS[currentStep]
    addUserMessage(choice.label)
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: choice.id }))

    // Move to summary
    setTimeout(() => {
      setShowSummary(true)
    }, 500)
  }

  const handleConfirm = () => {
    // In demo mode or after saving, go to plan selection
    if (isDemo) {
      navigate('/onboarding/plan')
    } else {
      // Save to Firestore then navigate
      navigate('/onboarding/plan')
    }
  }

  const handleModify = () => {
    setShowSummary(false)
    setCurrentStep(1)
    setMessages([])
    setAnswers({})
    // Restart
    simulateAIMessage(QUESTIONS[0].content, () => {
      setTimeout(() => {
        addAIMessage(QUESTIONS[1].content)
      }, 500)
    })
  }

  const currentQuestion = QUESTIONS[currentStep]

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white">Face Media Factory</h1>
              <p className="text-xs text-dark-500">Configuration de votre profil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-brand-500' : 'bg-dark-700'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex mb-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-brand-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                    message.type === 'user'
                      ? 'bg-brand-500 text-dark-950'
                      : 'bg-dark-800/50 text-dark-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-400" />
              </div>
              <div className="bg-dark-800/50 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-dark-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-dark-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-dark-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Summary */}
          {showSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="glass-card p-6 border-brand-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white">Votre profil de prospection</h3>
                    <p className="text-xs text-dark-500">Voici ce que j'ai compris :</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-dark-500">Secteur</p>
                      <p className="text-white">{answers.sector}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-dark-500">Offre</p>
                      <p className="text-white">{answers.offer}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-dark-500">Cible</p>
                      <p className="text-white">{answers.target}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-dark-500">Zone</p>
                      <p className="text-white">{answers.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-dark-500">Objectif</p>
                      <p className="text-white">
                        {answers.objective === 'first_clients' && 'Trouver mes premiers clients'}
                        {answers.objective === 'scale' && 'Augmenter mon nombre de clients'}
                        {answers.objective === 'new_offer' && 'Lancer une nouvelle offre'}
                        {answers.objective === 'new_market' && 'Tester un nouveau marche'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirm}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Oui, c'est parfait
                  </button>
                  <button
                    onClick={handleModify}
                    className="btn-secondary flex-1"
                  >
                    Non, modifier
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {!showSummary && currentQuestion && (
        <div className="border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {/* Suggestions */}
            {currentQuestion.suggestions && (
              <div className="flex flex-wrap gap-2 mb-3">
                {currentQuestion.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Choices for objective question */}
            {currentQuestion.type === 'choice' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {currentQuestion.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceClick(choice)}
                    className="glass-card p-4 text-left hover:border-brand-500/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
                      <choice.icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm font-medium text-white">{choice.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            {currentQuestion.type === 'question' && (
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={currentQuestion.placeholder}
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

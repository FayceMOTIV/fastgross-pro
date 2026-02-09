import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Check,
  ArrowRight,
  Mail,
  Smartphone,
  MessageSquare,
  Instagram,
  Phone,
  Send,
  Sparkles,
  Rocket,
  Target,
  Calendar,
  Clock,
  Users,
  Building2,
  MapPin,
  TrendingUp,
  Play,
  PartyPopper,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import Confetti from 'react-confetti'
import { useDemo } from '@/contexts/DemoContext'

// Channel icons mapping
const CHANNEL_ICONS = {
  email: { icon: Mail, color: 'from-blue-500 to-cyan-500', label: 'Email' },
  sms: { icon: Smartphone, color: 'from-emerald-500 to-teal-500', label: 'SMS' },
  whatsapp: { icon: MessageSquare, color: 'from-green-500 to-emerald-500', label: 'WhatsApp' },
  instagram: { icon: Instagram, color: 'from-pink-500 to-rose-500', label: 'Instagram DM' },
  voicemail: { icon: Phone, color: 'from-violet-500 to-purple-500', label: 'Voicemail' },
  courrier: { icon: Send, color: 'from-amber-500 to-orange-500', label: 'Courrier' },
}

// Tone labels
const TONE_LABELS = {
  professional: { label: 'Professionnel', emoji: '👔' },
  friendly: { label: 'Amical', emoji: '😊' },
  direct: { label: 'Direct', emoji: '🎯' },
}

// Frequency labels
const FREQUENCY_LABELS = {
  aggressive: { label: 'Intensif', days: '2-3 jours' },
  balanced: { label: 'Equilibre', days: '4-5 jours' },
  gentle: { label: 'Doux', days: '7+ jours' },
}

// Generate mock sequence based on onboarding data
const generateSequence = (data) => {
  const { businessName, sector, offer, target, channels, tone, frequency } = data

  const delayDays = {
    aggressive: [0, 2, 4, 6],
    balanced: [0, 3, 6, 10],
    gentle: [0, 5, 10, 15],
  }

  const toneStyle = {
    professional: { greeting: 'Bonjour', closing: 'Cordialement' },
    friendly: { greeting: 'Salut', closing: 'A bientot' },
    direct: { greeting: 'Bonjour', closing: 'Bien a vous' },
  }

  const style = toneStyle[tone] || toneStyle.professional
  const delays = delayDays[frequency] || delayDays.balanced

  const sequence = []
  let stepIndex = 0

  // Email steps
  if (channels.includes('email')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'email',
      delay: delays[0],
      subject: `${businessName} - Une solution pour ${target}`,
      preview: `${style.greeting},\n\nJe me permets de vous contacter car j'ai identifie que ${sector} est un secteur ou nous pouvons apporter une vraie valeur.\n\nNotre offre: ${offer}\n\n${style.closing}`,
    })

    sequence.push({
      step: ++stepIndex,
      channel: 'email',
      delay: delays[1],
      subject: `Re: ${businessName}`,
      preview: `${style.greeting},\n\nJe me permets de vous relancer suite a mon precedent message. Seriez-vous disponible pour un echange de 15 minutes ?\n\n${style.closing}`,
    })
  }

  // SMS step
  if (channels.includes('sms')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'sms',
      delay: delays[2],
      preview: `${style.greeting}, suite a mes emails - disponible pour un call de 10min sur ${offer.substring(0, 30)}... ? [Votre nom]`,
    })
  }

  // WhatsApp step
  if (channels.includes('whatsapp')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'whatsapp',
      delay: delays[2],
      preview: `${style.greeting} ! Je vous ai contacte par email concernant notre solution pour ${target}. Avez-vous eu le temps d'y jeter un oeil ?`,
    })
  }

  // Instagram step
  if (channels.includes('instagram')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'instagram',
      delay: delays[3],
      preview: `Bonjour ! Je me permets de vous contacter ici suite a mes precedents messages. Notre solution pourrait vraiment aider ${target}.`,
    })
  }

  // Voicemail step
  if (channels.includes('voicemail')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'voicemail',
      delay: delays[3],
      preview: `${style.greeting}, c'est [Votre nom] de ${businessName}. Je vous laisse ce message suite a mes emails. Je serais ravi d'echanger avec vous. Rappellez-moi au [numero].`,
    })
  }

  // Courrier step
  if (channels.includes('courrier')) {
    sequence.push({
      step: ++stepIndex,
      channel: 'courrier',
      delay: delays[3] + 3,
      preview: `Lettre personnalisee avec presentation de ${offer} et QR code vers votre calendrier de reservation.`,
    })
  }

  return sequence.slice(0, 6) // Max 6 steps
}

export default function OnboardingComplete() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()

  const [showConfetti, setShowConfetti] = useState(true)
  const [isGenerating, setIsGenerating] = useState(true)
  const [sequence, setSequence] = useState([])
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  // Get onboarding data from localStorage
  const [onboardingData, setOnboardingData] = useState(null)

  useEffect(() => {
    // Try to get data from localStorage (saved during onboarding)
    const savedData = localStorage.getItem('fmf_onboarding_complete')
    if (savedData) {
      const data = JSON.parse(savedData)
      setOnboardingData(data)

      // Simulate AI generation
      setTimeout(() => {
        const generatedSequence = generateSequence(data)
        setSequence(generatedSequence)
        setIsGenerating(false)
      }, 2000)
    } else {
      // Fallback demo data
      const demoData = {
        businessName: 'Mon Entreprise',
        sector: 'Services B2B',
        offer: 'Solution de prospection automatisee',
        target: 'Dirigeants PME',
        zone: 'France',
        channels: ['email', 'sms', 'whatsapp'],
        tone: 'professional',
        frequency: 'balanced',
      }
      setOnboardingData(demoData)

      setTimeout(() => {
        const generatedSequence = generateSequence(demoData)
        setSequence(generatedSequence)
        setIsGenerating(false)
      }, 2000)
    }

    // Stop confetti after 5 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000)

    return () => clearTimeout(confettiTimer)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleGoToDashboard = () => {
    localStorage.removeItem('fmf_onboarding_complete')
    if (isDemo) {
      navigate('/app?demo=true')
    } else {
      navigate('/app')
    }
  }

  const handleGoToForgeur = () => {
    localStorage.removeItem('fmf_onboarding_complete')
    if (isDemo) {
      navigate('/app/forgeur?demo=true')
    } else {
      navigate('/app/forgeur')
    }
  }

  if (!onboardingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}

      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg">Face Media Factory</h1>
                <p className="text-sm text-white/60">Configuration terminee</p>
              </div>
            </div>
            {isDemo && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25">
                Demo
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30 mb-6"
            >
              <PartyPopper className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Votre strategie est <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">prete</span> !
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Nous avons genere votre premiere sequence de prospection personnalisee
            </p>
          </motion.div>

          {/* Strategy Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-white/60">Entreprise</span>
              </div>
              <p className="text-white font-medium truncate">{onboardingData.businessName}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-white/60">Cible</span>
              </div>
              <p className="text-white font-medium truncate">{onboardingData.target}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-white/60">Zone</span>
              </div>
              <p className="text-white font-medium truncate">{onboardingData.zone}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-white/60">Ton</span>
              </div>
              <p className="text-white font-medium">
                {TONE_LABELS[onboardingData.tone]?.emoji} {TONE_LABELS[onboardingData.tone]?.label}
              </p>
            </div>
          </motion.div>

          {/* Channels Selected */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-8"
          >
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Vos canaux de prospection
            </h3>
            <div className="flex flex-wrap gap-3">
              {onboardingData.channels.map((channelId) => {
                const channel = CHANNEL_ICONS[channelId]
                if (!channel) return null
                const Icon = channel.icon
                return (
                  <div
                    key={channelId}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${channel.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-medium">{channel.label}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-white/50 text-sm mt-4">
              Frequence: {FREQUENCY_LABELS[onboardingData.frequency]?.label} ({FREQUENCY_LABELS[onboardingData.frequency]?.days} entre chaque message)
            </p>
          </motion.div>

          {/* Generated Sequence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Votre premiere sequence IA
              </h3>
              {isGenerating && (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generation en cours...</span>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white/60">L'IA analyse votre profil et genere vos messages...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="sequence"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {sequence.map((step, index) => {
                    const channel = CHANNEL_ICONS[step.channel]
                    const Icon = channel?.icon || Mail

                    return (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                      >
                        {/* Connector line */}
                        {index > 0 && (
                          <div className="absolute left-6 -top-4 w-0.5 h-4 bg-white/20" />
                        )}

                        <div className="flex gap-4">
                          {/* Step indicator */}
                          <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${channel?.color || 'from-violet-500 to-purple-600'} flex items-center justify-center shadow-lg`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-white/50">
                              <Clock className="w-3 h-3" />
                              J+{step.delay}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-white/60 bg-white/10 px-2 py-1 rounded-full">
                                Etape {step.step} - {channel?.label}
                              </span>
                            </div>
                            {step.subject && (
                              <p className="text-sm font-medium text-white mb-2">
                                Objet: {step.subject}
                              </p>
                            )}
                            <p className="text-sm text-white/70 whitespace-pre-line line-clamp-3">
                              {step.preview}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoToForgeur}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Modifier ma sequence
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoToDashboard}
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              Commencer a prospecter
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Info note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-white/40 text-sm mt-6"
          >
            Vous pouvez modifier votre strategie a tout moment dans les parametres
          </motion.p>
        </div>
      </main>
    </div>
  )
}

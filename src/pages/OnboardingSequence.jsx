import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Mail,
  Clock,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Sparkles,
  Check,
  Calendar,
  Send,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useDemo } from '@/hooks/useDemo'
import { CHANNEL_STYLES, SEQUENCE_TEMPLATES } from '@/engine/multiChannelEngine'

// Channel icon component
const ChannelIcon = ({ channel, className = 'w-4 h-4' }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    facebook_dm: MessageSquare,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
}

// Multichannel sequence (5 steps)
const MULTICHANNEL_SEQUENCE = [
  {
    id: 1,
    day: 0,
    channel: 'email',
    label: 'Email 1 - Accroche personnalisee',
    subject: 'Une question rapide sur {{company}}',
    preview:
      'Bonjour {{firstName}},\n\nJe me permets de vous contacter car je travaille avec plusieurs entreprises de votre secteur...',
    fullContent: `Bonjour {{firstName}},

Je me permets de vous contacter car je travaille avec plusieurs entreprises de votre secteur et j'ai remarque que {{company}} pourrait beneficier de nos solutions.

En quelques mots, nous aidons les professionnels comme vous a automatiser leur prospection tout en maintenant une approche personnalisee.

Seriez-vous ouvert a un echange de 15 minutes cette semaine pour en discuter ?

Bien cordialement`,
    type: 'initial',
  },
  {
    id: 2,
    day: 3,
    channel: 'sms',
    label: 'SMS - Relance courte "30 sec ?"',
    subject: null,
    preview:
      'Bonjour {{firstName}}, je vous ai envoye un email au sujet de {{company}}. 30 sec pour en discuter ?',
    fullContent:
      'Bonjour {{firstName}}, je vous ai envoye un email au sujet de {{company}}. 30 sec pour en discuter ? {{senderName}}',
    type: 'followup',
  },
  {
    id: 3,
    day: 7,
    channel: 'instagram_dm',
    label: 'Instagram DM - Approche sociale',
    subject: null,
    preview: "Hey {{firstName}} ! Je suivais {{company}} et j'adore ce que vous faites...",
    fullContent:
      "Hey {{firstName}} ! Je suivais {{company}} et j'adore ce que vous faites. Je vous ai envoye un email — est-ce que vous avez eu le temps de le voir ?",
    type: 'followup',
  },
  {
    id: 4,
    day: 12,
    channel: 'email',
    label: 'Email 2 - Valeur ajoutee (cas client)',
    subject: 'Re: Une question rapide sur {{company}}',
    preview:
      'Bonjour {{firstName}},\n\nJe me permets de revenir vers vous suite a mon precedent message...',
    fullContent: `Bonjour {{firstName}},

Je me permets de revenir vers vous suite a mon precedent message.

Je comprends que vous etes certainement tres occupe(e), mais je souhaitais vous partager rapidement un cas client pertinent pour votre activite.

[Client similaire] a augmente son nombre de leads qualifies de 340% en 3 mois grace a notre approche.

Est-ce que cela vous interesserait d'en savoir plus ?

Bien cordialement`,
    type: 'followup',
  },
  {
    id: 5,
    day: 20,
    channel: 'voicemail',
    label: 'Message vocal - Touche humaine finale',
    subject: null,
    preview:
      "Bonjour {{firstName}}, c'est {{senderName}}. Je vous ai envoye un email il y a quelques jours...",
    fullContent:
      "Bonjour {{firstName}}, c'est {{senderName}}. Je vous ai envoye un email il y a quelques jours au sujet de {{company}}. J'avais une idee qui pourrait vraiment vous interesser. N'hesitez pas a me rappeler ou a repondre a mon email. Bonne journee !",
    type: 'breakup',
  },
]

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professionnel', description: 'Formel et structure' },
  { id: 'friendly', label: 'Amical', description: 'Decontracte mais respectueux' },
  { id: 'direct', label: 'Direct', description: 'Court et percutant' },
]

const DELAY_OPTIONS = [
  { id: 'aggressive', label: 'Agressif', delays: [0, 2, 4], description: '2-4 jours entre emails' },
  { id: 'balanced', label: 'Equilibre', delays: [0, 3, 7], description: '3-7 jours entre emails' },
  { id: 'gentle', label: 'Doux', delays: [0, 5, 12], description: '5-12 jours entre emails' },
]

export default function OnboardingSequence() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()
  const [selectedStep, setSelectedStep] = useState(0)
  const [selectedTone, setSelectedTone] = useState('professional')
  const [selectedDelay, setSelectedDelay] = useState('balanced')
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Channel toggles
  const [enabledChannels, setEnabledChannels] = useState({
    email: true,
    sms: true,
    instagram_dm: true,
    voicemail: true,
    courrier: false,
  })

  const toggleChannel = (channel) => {
    if (channel === 'email') return // Email always enabled
    setEnabledChannels((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }))
  }

  // Filter sequence based on enabled channels
  const filteredSequence = MULTICHANNEL_SEQUENCE.filter((step) => enabledChannels[step.channel])

  const handleRegenerate = () => {
    setIsRegenerating(true)
    setTimeout(() => {
      setIsRegenerating(false)
    }, 1500)
  }

  const handleComplete = () => {
    setIsLoading(true)
    // Simulate saving
    setTimeout(() => {
      // Navigate to dashboard with demo param if in demo mode
      if (isDemo) {
        navigate('/app?demo=true')
      } else {
        navigate('/app')
      }
    }, 1000)
  }

  const currentDelay = DELAY_OPTIONS.find((d) => d.id === selectedDelay)

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
              <p className="text-xs text-dark-500">Configuration sequence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <div className="w-2 h-2 rounded-full bg-brand-500" />
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
            <span className="text-sm text-brand-400">Sequence multicanale generee par IA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Votre sequence multicanale
          </h1>
          <p className="text-dark-400 max-w-2xl mx-auto">
            Voici la sequence que nous avons generee pour vous. Activez les canaux de votre choix et
            personnalisez le rythme.
          </p>

          {/* Multichannel preview icons */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {Object.entries(CHANNEL_STYLES)
              .slice(0, 5)
              .map(([channel, style]) => {
                if (['reply', 'stopped', 'facebook_dm', 'whatsapp'].includes(channel)) return null
                const isEnabled = enabledChannels[channel]
                return (
                  <div
                    key={channel}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      isEnabled
                        ? `${style.bg} ${style.border}`
                        : 'bg-dark-800/50 border-dark-700 opacity-50'
                    }`}
                  >
                    <ChannelIcon
                      channel={channel}
                      className={`w-4 h-4 ${isEnabled ? style.color : 'text-dark-500'}`}
                    />
                    <span
                      className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-dark-500'}`}
                    >
                      {style.label}
                    </span>
                  </div>
                )
              })}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Sequence + Channel Toggles + Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Channel Toggles */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Canaux actifs
              </h3>
              <div className="space-y-2">
                {[
                  { channel: 'email', locked: true },
                  { channel: 'sms' },
                  { channel: 'instagram_dm' },
                  { channel: 'voicemail' },
                  { channel: 'courrier', premium: true },
                ].map(({ channel, locked, premium }) => {
                  const style = CHANNEL_STYLES[channel]
                  const isEnabled = enabledChannels[channel]
                  return (
                    <button
                      key={channel}
                      onClick={() => !locked && toggleChannel(channel)}
                      disabled={locked}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                        isEnabled
                          ? `${style.bg} border ${style.border}`
                          : 'bg-dark-800/30 border border-dark-700'
                      } ${locked ? 'cursor-default' : 'cursor-pointer hover:border-dark-500'}`}
                    >
                      <div className="flex items-center gap-3">
                        <ChannelIcon
                          channel={channel}
                          className={`w-5 h-5 ${isEnabled ? style.color : 'text-dark-500'}`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-dark-400'}`}
                          >
                            {style.label}
                          </p>
                          {locked && <p className="text-xs text-dark-500">Toujours actif</p>}
                          {premium && (
                            <p className="text-xs text-amber-400">Premium - 2.50 EUR/envoi</p>
                          )}
                        </div>
                      </div>
                      {locked ? (
                        <Check className="w-4 h-4 text-brand-400" />
                      ) : isEnabled ? (
                        <ToggleRight className="w-6 h-6 text-brand-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-dark-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* Multichannel Sequence Timeline */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-brand-400" />
                Sequence ({filteredSequence.length} etapes)
              </h3>
              <div className="space-y-3">
                {filteredSequence.map((step, index) => {
                  const style = CHANNEL_STYLES[step.channel]
                  return (
                    <button
                      key={step.id}
                      onClick={() => setSelectedStep(index)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedStep === index
                          ? `${style.bg} border ${style.border}`
                          : 'bg-dark-800/50 border border-transparent hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} border ${style.border}`}
                        >
                          <ChannelIcon
                            channel={step.channel}
                            className={`w-4 h-4 ${style.color}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 text-dark-500" />
                            <span className="text-xs text-dark-500">
                              {step.day === 0 ? 'Jour 1' : `J+${step.day}`}
                            </span>
                            <span className={`text-xs font-medium ${style.color}`}>
                              {style.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white truncate">{step.label}</p>
                          <p className="text-xs text-dark-400 mt-1 line-clamp-1">
                            {step.preview.split('\n')[0]}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 ${
                            selectedStep === index ? style.color : 'text-dark-500'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* Tone Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                Ton des emails
              </h3>
              <div className="space-y-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                      selectedTone === tone.id
                        ? 'bg-brand-500/20 border border-brand-500/30'
                        : 'bg-dark-800/50 border border-transparent hover:border-dark-600'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{tone.label}</p>
                      <p className="text-xs text-dark-400">{tone.description}</p>
                    </div>
                    {selectedTone === tone.id && <Check className="w-4 h-4 text-brand-400" />}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Delay Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-400" />
                Frequence d'envoi
              </h3>
              <div className="space-y-2">
                {DELAY_OPTIONS.map((delay) => (
                  <button
                    key={delay.id}
                    onClick={() => setSelectedDelay(delay.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                      selectedDelay === delay.id
                        ? 'bg-brand-500/20 border border-brand-500/30'
                        : 'bg-dark-800/50 border border-transparent hover:border-dark-600'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{delay.label}</p>
                      <p className="text-xs text-dark-400">{delay.description}</p>
                    </div>
                    {selectedDelay === delay.id && <Check className="w-4 h-4 text-brand-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Message Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="glass-card p-6 sticky top-8">
              {/* Header */}
              {filteredSequence[selectedStep] && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <ChannelIcon
                        channel={filteredSequence[selectedStep].channel}
                        className={`w-4 h-4 ${CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.color}`}
                      />
                      Apercu - {CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.label}
                    </h3>
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 text-dark-300 hover:text-white transition-colors text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      Regenerer
                    </button>
                  </div>

                  {/* Message Preview */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`rounded-xl overflow-hidden border ${
                        CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.bg
                      } ${CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.border}`}
                    >
                      {/* Channel Badge */}
                      <div
                        className={`px-4 py-3 border-b ${CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.border}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.bg
                            }`}
                          >
                            <ChannelIcon
                              channel={filteredSequence[selectedStep].channel}
                              className={`w-5 h-5 ${CHANNEL_STYLES[filteredSequence[selectedStep].channel]?.color}`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {filteredSequence[selectedStep].label}
                            </p>
                            <p className="text-xs text-dark-400">
                              {filteredSequence[selectedStep].day === 0
                                ? 'Jour 1'
                                : `J+${filteredSequence[selectedStep].day}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Email-specific meta */}
                      {filteredSequence[selectedStep].channel === 'email' && (
                        <div className="p-4 border-b border-dark-700 bg-dark-800/30">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-500 w-12">De:</span>
                              <span className="text-sm text-white">vous@votreentreprise.com</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-500 w-12">A:</span>
                              <span className="text-sm text-dark-300">{'{{email}}'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-500 w-12">Objet:</span>
                              <span className="text-sm text-white">
                                {filteredSequence[selectedStep].subject}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Message Body */}
                      <div className="p-6 bg-dark-800/30">
                        <pre className="text-sm text-dark-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {filteredSequence[selectedStep].fullContent}
                        </pre>
                      </div>

                      {/* Channel-specific info */}
                      <div className="p-4 bg-dark-900/50 border-t border-dark-700">
                        {filteredSequence[selectedStep].channel === 'sms' && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-dark-400">SMS - Max 160 caracteres</span>
                            <span
                              className={`text-xs ${
                                filteredSequence[selectedStep].fullContent.length <= 160
                                  ? 'text-brand-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {filteredSequence[selectedStep].fullContent.length}/160
                            </span>
                          </div>
                        )}
                        {filteredSequence[selectedStep].channel === 'instagram_dm' && (
                          <div className="flex items-center gap-2 text-xs text-pink-400">
                            <Instagram className="w-3 h-3" />
                            <span>DM envoye uniquement si le compte Instagram est trouve</span>
                          </div>
                        )}
                        {filteredSequence[selectedStep].channel === 'voicemail' && (
                          <div className="flex items-center gap-2 text-xs text-purple-400">
                            <Mic className="w-3 h-3" />
                            <span>Message vocal depose sans faire sonner (30 sec max)</span>
                          </div>
                        )}
                        {filteredSequence[selectedStep].channel === 'email' && (
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 text-xs">
                              {'{{firstName}}'} = Prenom
                            </span>
                            <span className="px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 text-xs">
                              {'{{company}}'} = Entreprise
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setSelectedStep(Math.max(0, selectedStep - 1))}
                      disabled={selectedStep === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-dark-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Precedent
                    </button>
                    <div className="flex items-center gap-2">
                      {filteredSequence.map((step, index) => {
                        const style = CHANNEL_STYLES[step.channel]
                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedStep(index)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              selectedStep === index
                                ? `${style.bg} border ${style.border}`
                                : 'bg-dark-700'
                            }`}
                          >
                            <ChannelIcon
                              channel={step.channel}
                              className={`w-3 h-3 ${selectedStep === index ? style.color : 'text-dark-500'}`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() =>
                        setSelectedStep(Math.min(filteredSequence.length - 1, selectedStep + 1))
                      }
                      disabled={selectedStep === filteredSequence.length - 1}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-dark-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center mt-12"
        >
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Lancement en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Lancer ma prospection
              </>
            )}
          </button>
          <p className="text-dark-500 text-sm mt-4">
            Vous pourrez modifier vos emails a tout moment
          </p>
        </motion.div>
      </main>
    </div>
  )
}

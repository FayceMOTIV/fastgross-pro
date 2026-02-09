import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Mail,
  Check,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Smartphone,
  Calendar,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const CHANNELS = [
  {
    id: 'email',
    name: 'Email',
    description: 'Emails personnalises',
    icon: Mail,
    color: 'blue',
    required: true,
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Messages courts',
    icon: Smartphone,
    color: 'green',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Messages directs',
    icon: MessageSquare,
    color: 'emerald',
  },
]

const TONES = [
  { id: 'professional', name: 'Professionnel', description: 'Formel et structure' },
  { id: 'friendly', name: 'Amical', description: 'Decontracte et accessible' },
  { id: 'direct', name: 'Direct', description: 'Court et efficace' },
]

const FREQUENCIES = [
  { id: 'aggressive', name: 'Intensif', description: '2-3 jours entre les messages' },
  { id: 'balanced', name: 'Equilibre', description: '4-5 jours entre les messages' },
  { id: 'gentle', name: 'Doux', description: '7+ jours entre les messages' },
]

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
}

export default function OnboardingSequence() {
  const { data, completeOnboarding, goBack, isLoading: contextLoading } = useOnboardingFlow()
  const { isDemo } = useDemo()

  const [channels, setChannels] = useState(data.channels || ['email'])
  const [tone, setTone] = useState(data.tone || 'professional')
  const [frequency, setFrequency] = useState(data.frequency || 'balanced')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleChannel = (channelId) => {
    if (channelId === 'email') return // Email always required
    setChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    )
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    await completeOnboarding({ channels, tone, frequency })
  }

  const loading = isSubmitting || contextLoading

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white">Face Media Factory</h1>
                <p className="text-xs text-dark-500">Etape 3 sur 3 - Configuration</p>
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
              initial={{ width: '66%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm text-brand-400">Derniere etape</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              Configurez votre sequence
            </h2>
            <p className="text-dark-400">
              Choisissez les canaux et le rythme de votre prospection
            </p>
          </motion.div>

          {/* Channels */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 mb-6"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400" />
              Canaux de communication
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {CHANNELS.map((channel) => {
                const colors = colorClasses[channel.color]
                const isSelected = channels.includes(channel.id)
                const Icon = channel.icon

                return (
                  <button
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    disabled={channel.required}
                    className={`relative p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-dark-800/30 border-dark-700 hover:border-dark-600'
                    } ${channel.required ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <Check className={`w-4 h-4 ${colors.text}`} />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <p className="font-medium text-white mb-1">{channel.name}</p>
                    <p className="text-xs text-dark-400">{channel.description}</p>
                    {channel.required && (
                      <p className="text-xs text-brand-400 mt-2">Toujours actif</p>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Tone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 mb-6"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              Ton des messages
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    tone === t.id
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-dark-800/30 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white">{t.name}</p>
                    {tone === t.id && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <p className="text-xs text-dark-400">{t.description}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Frequency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 mb-10"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              Frequence d'envoi
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFrequency(f.id)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    frequency === f.id
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-dark-800/30 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white">{f.name}</p>
                    {frequency === f.id && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <p className="text-xs text-dark-400">{f.description}</p>
                </button>
              ))}
            </div>
          </motion.div>

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
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="btn-primary flex items-center gap-2 px-8 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalisation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Lancer ma prospection
                </>
              )}
            </button>
          </motion.div>

          {/* Note */}
          <p className="text-center text-dark-500 text-sm mt-6">
            Vous pourrez modifier ces parametres a tout moment
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center gap-6 text-xs text-dark-500">
          <span>Configuration terminee</span>
          <span className="w-1 h-1 rounded-full bg-dark-700" />
          <span>Pret a prospecter</span>
        </div>
      </footer>
    </div>
  )
}

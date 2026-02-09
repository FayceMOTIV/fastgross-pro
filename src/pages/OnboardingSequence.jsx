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
  PartyPopper,
} from 'lucide-react'
import { useOnboardingFlow } from '@/contexts/OnboardingContext'
import { useDemo } from '@/contexts/DemoContext'

const CHANNELS = [
  {
    id: 'email',
    name: 'Email',
    description: 'Emails personnalises',
    icon: Mail,
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/25',
    required: true,
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Messages courts',
    icon: Smartphone,
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/25',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Messages directs',
    icon: MessageSquare,
    gradient: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/25',
  },
]

const TONES = [
  {
    id: 'professional',
    name: 'Professionnel',
    description: 'Formel et structure',
    gradient: 'from-slate-500 to-slate-600',
  },
  {
    id: 'friendly',
    name: 'Amical',
    description: 'Decontracte et accessible',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'direct',
    name: 'Direct',
    description: 'Court et efficace',
    gradient: 'from-rose-500 to-pink-500',
  },
]

const FREQUENCIES = [
  {
    id: 'aggressive',
    name: 'Intensif',
    description: '2-3 jours',
    gradient: 'from-red-500 to-rose-500',
  },
  {
    id: 'balanced',
    name: 'Equilibre',
    description: '4-5 jours',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 'gentle',
    name: 'Doux',
    description: '7+ jours',
    gradient: 'from-sky-500 to-blue-500',
  },
]

export default function OnboardingSequence() {
  const { data, completeOnboarding, goBack, isLoading: contextLoading } = useOnboardingFlow()
  const { isDemo } = useDemo()

  const [channels, setChannels] = useState(data.channels || ['email'])
  const [tone, setTone] = useState(data.tone || 'professional')
  const [frequency, setFrequency] = useState(data.frequency || 'balanced')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleChannel = (channelId) => {
    if (channelId === 'email') return
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg">Face Media Factory</h1>
                <p className="text-sm text-white/60">Etape 3 sur 3 - Configuration</p>
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
              initial={{ width: '66%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-4">
              <PartyPopper className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Derniere etape</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
              Configurez votre sequence
            </h2>
            <p className="text-white/60 text-lg">
              Personnalisez votre strategie de prospection
            </p>
          </motion.div>

          {/* Channels */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              Canaux de communication
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {CHANNELS.map((channel) => {
                const isSelected = channels.includes(channel.id)
                const Icon = channel.icon

                return (
                  <motion.button
                    key={channel.id}
                    whileHover={{ scale: channel.required ? 1 : 1.02 }}
                    whileTap={{ scale: channel.required ? 1 : 0.98 }}
                    onClick={() => toggleChannel(channel.id)}
                    disabled={channel.required}
                    className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'bg-white/10 border-white/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    } ${channel.required ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3"
                      >
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${channel.gradient} flex items-center justify-center shadow-lg ${channel.shadow}`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </motion.div>
                    )}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${channel.gradient} flex items-center justify-center mb-3 shadow-lg ${channel.shadow}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-medium text-white mb-1">{channel.name}</p>
                    <p className="text-sm text-white/50">{channel.description}</p>
                    {channel.required && (
                      <p className="text-xs text-emerald-400 mt-2 font-medium">Toujours actif</p>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* Tone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              Ton des messages
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {TONES.map((t) => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTone(t.id)}
                  className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                    tone === t.id
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {tone === t.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3"
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${t.gradient} mb-3`} />
                  <p className="font-medium text-white mb-1">{t.name}</p>
                  <p className="text-sm text-white/50">{t.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Frequency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-10"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              Frequence d'envoi
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {FREQUENCIES.map((f) => (
                <motion.button
                  key={f.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFrequency(f.id)}
                  className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                    frequency === f.id
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {frequency === f.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3"
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${f.gradient} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${f.gradient} mb-3`} />
                  <p className="font-medium text-white mb-1">{f.name}</p>
                  <p className="text-sm text-white/50">{f.description}</p>
                </motion.button>
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={goBack}
              className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleComplete}
              disabled={loading}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finalisation...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Lancer ma prospection
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
            Modifiable a tout moment dans les parametres
          </motion.p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Pret a demarrer
          </span>
          <span>Configuration terminee</span>
        </div>
      </footer>
    </div>
  )
}

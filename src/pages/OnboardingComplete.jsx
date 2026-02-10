import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import {
  Check,
  ArrowRight,
  Sparkles,
  Rocket,
  Search,
  Globe,
  Users,
  Target,
  Zap,
  PartyPopper,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  Mail,
  FileText,
} from 'lucide-react'
import Confetti from 'react-confetti'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'

// Progress steps configuration
const ENGINE_STEPS = [
  {
    id: 'starting',
    label: 'Initialisation',
    description: 'Demarrage du moteur de prospection',
    icon: Rocket,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'checking_existing',
    label: 'Verification',
    description: 'Verification des prospects existants',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'finding_companies',
    label: 'Recherche IA',
    description: 'L\'IA recherche des entreprises correspondant a votre ICP',
    icon: Target,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'scraping',
    label: 'Analyse des sites',
    description: 'Analyse des sites web et extraction des donnees',
    icon: Globe,
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'saving',
    label: 'Sauvegarde',
    description: 'Enregistrement des prospects dans votre base',
    icon: Users,
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'generating_sequences',
    label: 'Generation sequences',
    description: 'Creation des messages personnalises pour chaque prospect',
    icon: FileText,
    color: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'done',
    label: 'Termine',
    description: 'Votre base de prospects est prete !',
    icon: PartyPopper,
    color: 'from-emerald-500 to-green-500',
  },
]

// Find step index
function getStepIndex(stepId) {
  const index = ENGINE_STEPS.findIndex((s) => s.id === stepId)
  return index >= 0 ? index : 0
}

export default function OnboardingComplete() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()

  const [engineStatus, setEngineStatus] = useState({
    status: 'pending',
    step: null,
    progress: 0,
    message: '',
    stats: null,
    error: null,
  })
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  // Current step info
  const currentStepIndex = getStepIndex(engineStatus.step)
  const currentStepInfo = ENGINE_STEPS[currentStepIndex] || ENGINE_STEPS[0]
  const isCompleted = engineStatus.status === 'completed'
  const isError = engineStatus.status === 'error'
  const isRunning = engineStatus.status === 'running'

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Subscribe to engine status updates from Firestore
  useEffect(() => {
    if (!user?.uid || isDemo) return

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.data()
        if (data?.engineStatus) {
          setEngineStatus(data.engineStatus)

          // Show confetti when completed
          if (data.engineStatus.status === 'completed' && !showConfetti) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 5000)
          }
        }
      },
      (error) => {
        console.error('Error listening to engine status:', error)
      }
    )

    return () => unsubscribe()
  }, [user?.uid, isDemo, showConfetti])

  // Start the prospect engine
  const startEngine = useCallback(async () => {
    if (!user?.uid || !currentOrg?.id || hasStarted) return

    setHasStarted(true)
    setEngineStatus({
      status: 'running',
      step: 'starting',
      progress: 0,
      message: 'Demarrage du moteur...',
      stats: null,
      error: null,
    })

    try {
      const prospectEngine = httpsCallable(functions, 'prospectEngine')
      await prospectEngine({ orgId: currentOrg.id })
    } catch (error) {
      console.error('Engine error:', error)
      setEngineStatus((prev) => ({
        ...prev,
        status: 'error',
        error: error.message || 'Une erreur est survenue',
      }))
    }
  }, [user?.uid, currentOrg?.id, hasStarted])

  // Auto-start engine when component mounts (non-demo mode)
  useEffect(() => {
    if (!isDemo && user?.uid && currentOrg?.id && !hasStarted) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        startEngine()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isDemo, user?.uid, currentOrg?.id, hasStarted, startEngine])

  // Demo mode simulation
  useEffect(() => {
    if (!isDemo) return

    const steps = ['starting', 'checking_existing', 'finding_companies', 'scraping', 'saving', 'generating_sequences', 'done']
    let currentIndex = 0

    setEngineStatus({
      status: 'running',
      step: 'starting',
      progress: 0,
      message: 'Demarrage du moteur (demo)...',
      stats: null,
      error: null,
    })

    const interval = setInterval(() => {
      currentIndex++
      if (currentIndex >= steps.length) {
        clearInterval(interval)
        setEngineStatus({
          status: 'completed',
          step: 'done',
          progress: 100,
          message: 'Termine! 18 prospects trouves, 8 sequences pretes.',
          stats: {
            found: 20,
            created: 18,
            scored: 18,
            sequenced: 8,
            hotLeads: 5,
            warmLeads: 10,
          },
          error: null,
        })
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
        return
      }

      const progress = Math.round((currentIndex / (steps.length - 1)) * 100)
      const messages = {
        checking_existing: 'Verification des doublons...',
        finding_companies: 'L\'IA recherche des entreprises...',
        scraping: `Analyse des sites web (${Math.min(currentIndex * 4, 18)}/20)...`,
        saving: 'Sauvegarde des prospects...',
        generating_sequences: 'Generation des sequences IA...',
      }

      setEngineStatus({
        status: 'running',
        step: steps[currentIndex],
        progress,
        message: messages[steps[currentIndex]] || '',
        stats: null,
        error: null,
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isDemo])

  const handleGoToDashboard = () => {
    localStorage.removeItem('fmf_onboarding_complete')
    navigate(isDemo ? '/app?demo=true' : '/app')
  }

  const handleRetry = () => {
    setHasStarted(false)
    setEngineStatus({
      status: 'pending',
      step: null,
      progress: 0,
      message: '',
      stats: null,
      error: null,
    })
    setTimeout(() => startEngine(), 500)
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
        <div
          className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                  isCompleted ? 'from-emerald-500 to-teal-600' : 'from-violet-500 to-purple-600'
                } flex items-center justify-center shadow-lg`}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <Zap className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg">Face Media Factory</h1>
                <p className="text-sm text-white/60">
                  {isCompleted ? 'Configuration terminee' : 'Initialisation en cours'}
                </p>
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
        <div className="max-w-3xl mx-auto">
          {/* Header based on status */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br ${currentStepInfo.color} shadow-2xl mb-6`}
            >
              {isRunning ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : isError ? (
                <AlertCircle className="w-10 h-10 text-white" />
              ) : (
                <currentStepInfo.icon className="w-10 h-10 text-white" />
              )}
            </motion.div>

            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              {isCompleted ? (
                <>
                  Votre base est{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                    prete
                  </span>{' '}
                  !
                </>
              ) : isError ? (
                <>
                  Une{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    erreur
                  </span>{' '}
                  est survenue
                </>
              ) : (
                <>
                  Preparation de votre{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                    strategie
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto">
              {isCompleted
                ? engineStatus.message
                : isError
                ? engineStatus.error
                : 'L\'IA recherche et analyse des prospects correspondant a votre profil client ideal'}
            </p>
          </motion.div>

          {/* Progress Bar */}
          {!isCompleted && !isError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/60">{currentStepInfo.description}</span>
                <span className="text-sm font-medium text-white">{engineStatus.progress}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${engineStatus.progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                />
              </div>
              {engineStatus.message && (
                <p className="text-sm text-white/50 mt-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {engineStatus.message}
                </p>
              )}
            </motion.div>
          )}

          {/* Steps Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-8"
          >
            <h3 className="text-lg font-display font-semibold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Progression du moteur
            </h3>

            <div className="space-y-4">
              {ENGINE_STEPS.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === engineStatus.step
                const isPast = index < currentStepIndex
                const isFuture = index > currentStepIndex

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-white/10 border border-white/20'
                        : isPast
                        ? 'opacity-60'
                        : 'opacity-30'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPast
                          ? 'bg-emerald-500/20'
                          : isActive
                          ? `bg-gradient-to-br ${step.color}`
                          : 'bg-white/5'
                      }`}
                    >
                      {isPast ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : isActive && isRunning ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <StepIcon
                          className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/50'}`}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          isActive ? 'text-white' : isPast ? 'text-white/70' : 'text-white/40'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-sm text-white/50">{step.description}</p>
                    </div>

                    {/* Status indicator */}
                    {isPast && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                        Termine
                      </span>
                    )}
                    {isActive && isRunning && (
                      <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400">
                        En cours
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Stats (when completed) */}
          <AnimatePresence>
            {isCompleted && engineStatus.stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {engineStatus.stats.created}
                  </div>
                  <div className="text-sm text-white/60">Prospects trouves</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-1">
                    {engineStatus.stats.hotLeads}
                  </div>
                  <div className="text-sm text-white/60">Leads chauds</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 text-center">
                  <div className="text-3xl font-bold text-amber-400 mb-1">
                    {engineStatus.stats.warmLeads}
                  </div>
                  <div className="text-sm text-white/60">Leads tiedes</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">
                    {engineStatus.stats.sequenced}
                  </div>
                  <div className="text-sm text-white/60">Sequences pretes</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isError && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRetry}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reessayer
              </motion.button>
            )}

            {isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToDashboard}
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                Acceder a mon tableau de bord
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            )}

            {isRunning && (
              <p className="text-white/50 text-sm">
                Veuillez patienter, cela peut prendre quelques minutes...
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

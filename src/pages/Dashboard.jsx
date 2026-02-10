import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Users,
  Mail,
  MessageSquare,
  Zap,
  ArrowRight,
  TrendingUp,
  Activity,
  Eye,
  CheckCircle,
  Target,
  Send,
  Calendar,
  Play,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  X,
  Loader2,
  Search,
  RefreshCw,
  Rocket,
  AlertCircle,
  Clock,
  Pause,
  Power,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend
)

import { useRealDashboardStats, useEngineStatus } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'

// Channel icon mapping
const ChannelIcon = ({ channel, className = 'w-4 h-4' }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
}

const CHANNEL_STYLES = {
  email: { bg: 'bg-blue-100', color: 'text-blue-600', border: 'border-blue-200', label: 'Email' },
  sms: { bg: 'bg-emerald-100', color: 'text-emerald-600', border: 'border-emerald-200', label: 'SMS' },
  whatsapp: { bg: 'bg-green-100', color: 'text-green-600', border: 'border-green-200', label: 'WhatsApp' },
  instagram_dm: { bg: 'bg-pink-100', color: 'text-pink-600', border: 'border-pink-200', label: 'Instagram' },
  voicemail: { bg: 'bg-purple-100', color: 'text-purple-600', border: 'border-purple-200', label: 'Vocal' },
  courrier: { bg: 'bg-amber-100', color: 'text-amber-600', border: 'border-amber-200', label: 'Courrier' },
}

// Chart.js options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1A1F36',
      bodyColor: '#5E6687',
      borderColor: 'rgba(79, 110, 247, 0.1)',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#8F95B2', font: { size: 12 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(79, 110, 247, 0.06)' },
      ticks: { color: '#8F95B2', font: { size: 12 } },
      border: { display: false },
    },
  },
  interaction: { mode: 'index', intersect: false },
}

// Format time ago
const formatTimeAgo = (date) => {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return "A l'instant"
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  return `Il y a ${Math.floor(seconds / 86400)}j`
}

// ============================================================================
// INTELLIGENT STATUS WIDGET
// ============================================================================

function StatusWidget({ engineStatus, stats, pendingCampaigns, onLaunch, onSearch, isSearching }) {
  const { status, step, progress, message, currentCompany } = engineStatus

  // Determine widget state: idle | running | ready | active
  const getWidgetState = () => {
    if (status === 'running') return 'running'
    if (pendingCampaigns.length > 0) return 'ready'
    if (stats.activeCampaigns > 0) return 'active'
    return 'idle'
  }

  const widgetState = getWidgetState()

  // Widget configurations per state
  const widgetConfigs = {
    idle: {
      icon: Power,
      title: 'Moteur en attente',
      subtitle: 'Lancez le moteur pour trouver des prospects',
      gradient: 'from-slate-500/10 via-gray-50/50 to-slate-50/30',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      buttonText: 'Rechercher des prospects',
      buttonAction: onSearch,
      buttonIcon: Search,
      buttonGradient: 'from-accent to-purple-500',
    },
    running: {
      icon: Loader2,
      title: 'Recherche en cours...',
      subtitle: message || `Analyse de ${currentCompany || 'entreprises'}`,
      gradient: 'from-blue-500/10 via-indigo-50/50 to-purple-50/30',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
      buttonText: null,
      progress: progress,
    },
    ready: {
      icon: Rocket,
      title: `${pendingCampaigns.length} sequences pretes`,
      subtitle: 'Lancez votre journee de prospection',
      gradient: 'from-emerald-500/10 via-teal-50/50 to-green-50/30',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
      buttonText: 'Lancer ma journee',
      buttonAction: onLaunch,
      buttonIcon: Play,
      buttonGradient: 'from-emerald-500 to-teal-500',
    },
    active: {
      icon: Activity,
      title: 'Campagnes actives',
      subtitle: `${stats.activeCampaigns} campagnes en cours`,
      gradient: 'from-purple-500/10 via-violet-50/50 to-fuchsia-50/30',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
      buttonText: 'Voir les campagnes',
      buttonAction: () => {},
      buttonIcon: ArrowRight,
      buttonGradient: 'from-purple-500 to-fuchsia-500',
      link: '/app/campaigns',
    },
  }

  const config = widgetConfigs[widgetState]
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-8 bg-gradient-to-br ${config.gradient} border-accent/10`}
    >
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Left - Status indicator or progress */}
        <div className="flex-shrink-0">
          {widgetState === 'running' ? (
            <div className="relative w-[180px] h-[180px]">
              {/* Progress circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r="78"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-blue-100"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="78"
                  stroke="url(#blueGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={490}
                  strokeDashoffset={490 - (490 * progress) / 100}
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-2xl font-bold text-text">{progress}%</span>
              </div>
            </div>
          ) : (
            <div className={`w-[180px] h-[180px] rounded-full ${config.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-20 h-20 ${config.iconColor}`} />
            </div>
          )}
        </div>

        {/* Right - Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-text-muted text-sm mb-2">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-text mb-2">
            {config.title}
          </h1>
          <p className="text-text-secondary mb-6">{config.subtitle}</p>

          {/* Quick stats */}
          {widgetState !== 'running' && (
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.totalProspects || 0}</p>
                  <p className="text-xs text-text-muted">Prospects</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.hotLeads || 0}</p>
                  <p className="text-xs text-text-muted">Chauds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Send className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.totalMessages || 0}</p>
                  <p className="text-xs text-text-muted">Envoyes</p>
                </div>
              </div>
            </div>
          )}

          {/* Step info for running state */}
          {widgetState === 'running' && step && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="w-4 h-4" />
                <span>
                  {step === 'finding_companies' && 'Recherche d\'entreprises IA...'}
                  {step === 'scraping' && `Analyse de ${currentCompany || 'sites web'}...`}
                  {step === 'saving' && 'Sauvegarde des prospects...'}
                  {step === 'generating_sequences' && 'Generation des sequences...'}
                  {step === 'checking_existing' && 'Verification des doublons...'}
                  {step === 'starting' && 'Demarrage du moteur...'}
                </span>
              </div>
            </div>
          )}

          {/* CTA Button */}
          {config.buttonText && (
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {config.link ? (
                <Link
                  to={config.link}
                  className={`btn-primary bg-gradient-to-r ${config.buttonGradient} flex items-center gap-2`}
                >
                  <config.buttonIcon className="w-4 h-4" />
                  {config.buttonText}
                </Link>
              ) : (
                <button
                  onClick={config.buttonAction}
                  disabled={isSearching}
                  className={`btn-primary bg-gradient-to-r ${config.buttonGradient} flex items-center gap-2 disabled:opacity-50`}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <config.buttonIcon className="w-4 h-4" />
                  )}
                  {config.buttonText}
                </button>
              )}

              {widgetState === 'ready' && (
                <button
                  onClick={onSearch}
                  disabled={isSearching}
                  className="btn-secondary flex items-center gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Chercher plus
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// LAUNCH DAY MODAL
// ============================================================================

function LaunchDayModal({ isOpen, onClose, pendingCampaigns, onLaunch, isLaunching, launchProgress }) {
  if (!isOpen) return null

  const totalMessages = pendingCampaigns.reduce((acc, c) => acc + (c.steps?.length || 1), 0)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-text">Lancer ma journee</h2>
                  <p className="text-sm text-text-muted">Confirmation avant envoi</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLaunching ? (
              <div className="text-center py-8">
                <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-text mb-2">Lancement en cours...</h3>
                <p className="text-text-muted">
                  {launchProgress.current}/{launchProgress.total} campagnes activees
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(launchProgress.current / launchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : pendingCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text mb-2">Aucune campagne en attente</h3>
                <p className="text-text-muted">
                  Recherchez de nouveaux prospects pour continuer.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-accent/5 to-purple-50 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-accent">{pendingCampaigns.length}</p>
                      <p className="text-sm text-text-muted">Prospects</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-purple-600">{totalMessages}</p>
                      <p className="text-sm text-text-muted">Messages</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-6">
                  {pendingCampaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {campaign.prospectName || 'Prospect'}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {campaign.prospectCompany || 'Entreprise'}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted">
                        {campaign.steps?.length || 1} etapes
                      </span>
                    </div>
                  ))}
                  {pendingCampaigns.length > 5 && (
                    <p className="text-sm text-center text-text-muted">
                      + {pendingCampaigns.length - 5} autres
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Les messages seront envoyes selon le planning. Suivez l'avancement dans Campagnes.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isLaunching && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-text font-medium hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onLaunch}
                disabled={pendingCampaigns.length === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Lancer
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentOrg } = useOrg()

  // Real stats from Firestore
  const {
    stats,
    pendingCampaigns,
    hotProspects,
    recentActivity,
    dailyStats,
    loading: statsLoading,
  } = useRealDashboardStats()

  // Engine status
  const { engineStatus, loading: engineLoading } = useEngineStatus(user?.uid)

  // Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [launchProgress, setLaunchProgress] = useState({ current: 0, total: 0 })

  // Chart data
  const defaultChartData = [
    { name: 'Lun', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Mar', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Mer', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Jeu', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Ven', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Sam', envoyes: 0, ouverts: 0, reponses: 0 },
    { name: 'Dim', envoyes: 0, ouverts: 0, reponses: 0 },
  ]

  const chartData = dailyStats.length > 0 ? dailyStats : defaultChartData

  // Launch campaigns handler
  const handleLaunchDay = useCallback(async () => {
    if (!currentOrg?.id) return

    setIsLaunching(true)
    setLaunchProgress({ current: 0, total: pendingCampaigns.length })

    try {
      const runAutoPilot = httpsCallable(functions, 'runAutoPilotManual')
      const result = await runAutoPilot({ orgId: currentOrg.id })

      toast.success(`${pendingCampaigns.length} campagnes lancees!`)
      setShowLaunchModal(false)
    } catch (error) {
      console.error('Launch error:', error)
      toast.error('Erreur: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setIsLaunching(false)
    }
  }, [currentOrg?.id, pendingCampaigns.length])

  // Search new prospects handler
  const handleSearchProspects = useCallback(async () => {
    if (!currentOrg?.id) return

    setIsSearching(true)
    try {
      const prospectEngine = httpsCallable(functions, 'prospectEngine')
      toast.loading('Recherche de prospects en cours...', { id: 'search-prospects' })
      const result = await prospectEngine({ orgId: currentOrg.id })

      if (result.data?.success) {
        toast.success(`${result.data.prospectsCreated || 0} prospects trouves!`, { id: 'search-prospects' })
      } else {
        toast.success('Recherche terminee', { id: 'search-prospects' })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erreur: ' + (error.message || 'Erreur inconnue'), { id: 'search-prospects' })
    } finally {
      setIsSearching(false)
    }
  }, [currentOrg?.id])

  // Loading state
  if (statsLoading || engineLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Launch Day Modal */}
      <LaunchDayModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        pendingCampaigns={pendingCampaigns}
        onLaunch={handleLaunchDay}
        isLaunching={isLaunching}
        launchProgress={launchProgress}
      />

      {/* Intelligent Status Widget */}
      <StatusWidget
        engineStatus={engineStatus}
        stats={stats}
        pendingCampaigns={pendingCampaigns}
        onLaunch={() => setShowLaunchModal(true)}
        onSearch={handleSearchProspects}
        isSearching={isSearching}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 hover:shadow-soft-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-text">{stats.totalProspects || 0}</p>
          <p className="text-xs text-text-muted mt-1">Prospects total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-5 hover:shadow-soft-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-text">{stats.totalMessages || 0}</p>
          <p className="text-xs text-text-muted mt-1">Messages envoyes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5 hover:shadow-soft-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-text">{stats.replyRate || 0}%</p>
          <p className="text-xs text-text-muted mt-1">Taux de reponse</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5 border-success/20 hover:shadow-soft-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-success">{stats.hotLeads || 0}</p>
          <p className="text-xs text-text-muted mt-1">Leads chauds</p>
        </motion.div>
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Performance cette semaine</h2>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                Envoyes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-light" />
                Ouverts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                Reponses
              </span>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Line
              data={{
                labels: chartData.map((d) => d.name),
                datasets: [
                  {
                    label: 'Envoyes',
                    data: chartData.map((d) => d.envoyes),
                    borderColor: '#4F6EF7',
                    backgroundColor: 'rgba(79, 110, 247, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                  },
                  {
                    label: 'Ouverts',
                    data: chartData.map((d) => d.ouverts),
                    borderColor: '#818CF8',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                  },
                  {
                    label: 'Reponses',
                    data: chartData.map((d) => d.reponses),
                    borderColor: '#FBBF24',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="section-title">Activite recente</h2>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 8).map((activity, index) => {
                const channelStyle = activity.channel ? CHANNEL_STYLES[activity.channel] : null
                return (
                  <div key={activity.id || index} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        channelStyle
                          ? channelStyle.bg
                          : activity.type === 'reply'
                            ? 'bg-success/10'
                            : activity.type === 'converted'
                              ? 'bg-success/10'
                              : activity.type === 'opened'
                                ? 'bg-amber-100'
                                : 'bg-blue-100'
                      }`}
                    >
                      {channelStyle ? (
                        <ChannelIcon channel={activity.channel} className={`w-4 h-4 ${channelStyle.color}`} />
                      ) : activity.type === 'reply' ? (
                        <MessageSquare className="w-4 h-4 text-success" />
                      ) : activity.type === 'converted' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : activity.type === 'opened' ? (
                        <Eye className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{activity.message}</p>
                      <p className="text-xs text-text-muted truncate">{activity.details}</p>
                    </div>
                    <span className="text-xs text-text-muted flex-shrink-0">{activity.timeAgo}</span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">Aucune activite</p>
                <p className="text-xs text-text-muted mt-1">Lancez vos campagnes</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Multichannel KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <h2 className="section-title">Messages par canal</h2>
          </div>
          <span className="text-sm text-text-muted">{stats.totalMessages || 0} total</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['email', 'sms', 'whatsapp', 'voicemail', 'courrier'].map((channel) => {
            const style = CHANNEL_STYLES[channel]
            return (
              <div key={channel} className={`p-4 rounded-xl ${style.bg} border ${style.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ChannelIcon channel={channel} className={`w-5 h-5 ${style.color}`} />
                  <span className="text-sm font-medium text-text">{style.label}</span>
                </div>
                <p className="text-2xl font-bold text-text">{stats.byChannel?.[channel] || 0}</p>
                <p className="text-xs text-text-muted mt-1">
                  {stats.repliesByChannel?.[channel] || 0} reponses
                </p>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Hot Prospects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card p-6 border-success/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-success" />
            <h2 className="section-title">Prospects chauds</h2>
            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
              {hotProspects.length}
            </span>
          </div>
          <Link to="/app/prospects" className="btn-ghost text-sm flex items-center gap-1">
            Voir tous
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {hotProspects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {hotProspects.slice(0, 5).map((prospect) => (
              <div
                key={prospect.id}
                className="p-4 rounded-xl bg-surface-hover border border-accent/5 hover:border-success/30 hover:shadow-soft-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text truncate">{prospect.company}</p>
                    <p className="text-xs text-text-muted truncate">
                      {prospect.industry || prospect.sector} - {prospect.city}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    prospect.score >= 80
                      ? 'bg-success/10 text-success'
                      : prospect.score >= 60
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {prospect.score}
                  </span>
                </div>
                <p className="text-sm text-text truncate">{prospect.firstName} {prospect.lastName}</p>
                <p className="text-xs text-text-muted truncate">{prospect.email}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">Aucun prospect chaud</p>
            <p className="text-xs text-text-muted mt-1">
              Lancez le moteur pour trouver des prospects
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

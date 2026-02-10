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
  Euro,
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend
)
import DemoBanner, { DemoBadge } from '@/components/DemoBanner'
import { useRealDashboardStats } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useTour } from '@/components/OnboardingTour'
import { useDemo } from '@/contexts/DemoContext'
import {
  demoStats,
  demoDailyStats,
  demoClients,
  demoRecentActivity,
  getHotProspects,
} from '@/data/demoData'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'

// Channel icon mapping
const ChannelIcon = ({ channel, className = 'w-4 h-4' }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    facebook_dm: Users,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
}

// Chart.js options for light theme
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
      boxShadow: '0 4px 16px rgba(26, 31, 54, 0.1)',
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
  interaction: {
    mode: 'index',
    intersect: false,
  },
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

// Circular progress component - Light theme
function CircularProgress({ value, max, size = 200 }) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-accent/10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F6EF7" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-display font-bold text-text">{value}</span>
        <span className="text-text-muted text-sm">sur {max}</span>
      </div>
    </div>
  )
}

// Launch Day Modal
function LaunchDayModal({ isOpen, onClose, pendingCampaigns, onLaunch, isLaunching }) {
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
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {pendingCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text mb-2">
                  Aucune campagne en attente
                </h3>
                <p className="text-text-muted">
                  Toutes vos sequences ont deja ete lancees. Recherchez de nouveaux prospects pour
                  continuer.
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
                      <p className="text-sm text-text-muted">Messages a envoyer</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-6">
                  {pendingCampaigns.slice(0, 5).map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
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
                      + {pendingCampaigns.length - 5} autres prospects
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Les messages seront envoyes progressivement selon le planning de chaque
                      sequence. Vous pouvez suivre l'avancement dans l'onglet Campagnes.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-text font-medium hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onLaunch}
              disabled={pendingCampaigns.length === 0 || isLaunching}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Lancement...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Lancer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()
  const { userProfile } = useAuth()
  const { currentOrg } = useOrg()
  const { setIsOpen } = useTour()

  // Real stats from Firestore (non-demo mode)
  const {
    stats: realStats,
    pendingCampaigns: realPendingCampaigns,
    hotProspects: realHotProspects,
    recentActivity: realRecentActivity,
    dailyStats: realDailyStats,
    loading,
  } = useRealDashboardStats()

  // Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Launch tour for new users
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('fmf_tour_completed')
    if (!hasSeenTour && userProfile?.onboardingComplete) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        localStorage.setItem('fmf_tour_completed', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [userProfile, setIsOpen])

  // Use demo or real data
  const stats = isDemo
    ? {
        totalProspects: demoStats.totalProspects,
        totalLeads: demoStats.totalProspects,
        emailsSent: demoStats.totalEmailed,
        openRate: demoStats.avgOpenRate,
        replyRate: demoStats.avgReplyRate,
        hotLeads: demoClients.filter((c) => c.score >= 70).length,
        warmLeads: demoClients.filter((c) => c.score >= 40 && c.score < 70).length,
        totalRevenue: demoStats.totalRevenueNum,
        thisMonthRevenue: demoStats.thisMonth?.revenueNum || 0,
        converted: demoStats.totalConverted,
        todayToContact: 37,
        todayContacted: 12,
        todayReplies: 4,
        todaySigned: 1,
        pendingCampaigns: 15,
        totalMessages: demoStats.totalMessages || 0,
        byChannel: demoStats.byChannel || { email: 0, sms: 0, instagram_dm: 0, voicemail: 0, courrier: 0 },
        totalReplies: demoStats.totalReplies || 0,
        repliesByChannel: demoStats.repliesByChannel || {},
      }
    : {
        ...realStats,
        totalLeads: realStats.totalProspects,
        todayToContact: realStats.pendingCampaigns || 0,
      }

  // Pending campaigns for launch modal
  const pendingCampaigns = isDemo
    ? Array.from({ length: 15 }, (_, i) => ({
        id: `demo-${i}`,
        prospectName: demoClients[i % demoClients.length]?.company || 'Prospect',
        prospectCompany: demoClients[i % demoClients.length]?.sector || 'Entreprise',
        steps: [{ channel: 'email' }, { channel: 'sms' }],
      }))
    : realPendingCampaigns

  // Hot prospects
  const hotProspects = isDemo ? getHotProspects() : realHotProspects

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

  const chartData = isDemo && Array.isArray(demoDailyStats) && demoDailyStats.length > 0
    ? demoDailyStats.slice(-7).map((d) => ({
        name: d?.dayLabel || '',
        envoyes: d?.emailed || 0,
        ouverts: d?.opened || 0,
        reponses: d?.replied || 0,
      }))
    : realDailyStats.length > 0
    ? realDailyStats
    : defaultChartData

  // Activity feed
  const recentActivities = isDemo
    ? demoRecentActivity.map((a) => ({ ...a, timeAgo: formatTimeAgo(a.timestamp) }))
    : realRecentActivity

  // Today's date
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Launch campaigns handler
  const handleLaunchDay = useCallback(async () => {
    if (isDemo) {
      toast.success('Mode demo: Campagnes lancees avec succes!')
      setShowLaunchModal(false)
      return
    }

    setIsLaunching(true)
    try {
      const runAutoPilot = httpsCallable(functions, 'runAutoPilotManual')
      await runAutoPilot({ orgId: currentOrg?.id })
      toast.success(`${pendingCampaigns.length} campagnes lancees avec succes!`)
      setShowLaunchModal(false)
    } catch (error) {
      console.error('Launch error:', error)
      toast.error('Erreur lors du lancement: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setIsLaunching(false)
    }
  }, [isDemo, currentOrg?.id, pendingCampaigns.length])

  // Search new prospects handler
  const handleSearchProspects = useCallback(async () => {
    if (isDemo) {
      toast.success('Mode demo: Recherche de nouveaux prospects simulee!')
      return
    }

    setIsSearching(true)
    try {
      const prospectEngine = httpsCallable(functions, 'prospectEngine')
      toast.loading('Recherche de nouveaux prospects en cours...', { id: 'search-prospects' })
      await prospectEngine({ orgId: currentOrg?.id })
      toast.success('Nouveaux prospects trouves!', { id: 'search-prospects' })
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erreur: ' + (error.message || 'Erreur inconnue'), { id: 'search-prospects' })
    } finally {
      setIsSearching(false)
    }
  }, [isDemo, currentOrg?.id])

  // Show loading state
  if (!isDemo && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Demo Banner */}
      {isDemo && <DemoBanner page="dashboard" />}

      {/* Launch Day Modal */}
      <LaunchDayModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        pendingCampaigns={pendingCampaigns}
        onLaunch={handleLaunchDay}
        isLaunching={isLaunching}
      />

      {/* Hero Section - Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 bg-gradient-to-br from-accent/5 via-purple-50/50 to-pink-50/30 border-accent/10"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left - Progress Ring */}
          <div className="flex-shrink-0">
            <CircularProgress
              value={stats.todayContacted || 0}
              max={Math.max(stats.todayToContact || 1, 1)}
              size={180}
            />
          </div>

          {/* Right - Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-text-muted text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{today}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text mb-2">
              <span className="gradient-text">{stats.todayToContact || 0}</span> personnes a contacter
            </h1>
            <p className="text-text-secondary mb-6">
              {stats.todayToContact > 0
                ? `Vous avez ${stats.pendingCampaigns || 0} sequences pretes a etre lancees.`
                : 'Recherchez de nouveaux prospects pour commencer votre journee.'}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todayContacted || 0}</p>
                  <p className="text-xs text-text-muted">Envoyes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todayReplies || 0}</p>
                  <p className="text-xs text-text-muted">Reponses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todaySigned || 0}</p>
                  <p className="text-xs text-text-muted">Signe</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <button
                onClick={() => setShowLaunchModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Lancer ma journee
              </button>
              <button
                onClick={handleSearchProspects}
                disabled={isSearching}
                className="btn-secondary flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Rechercher nouveaux prospects
              </button>
            </div>
          </div>
        </div>
      </motion.div>

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
          <p className="text-2xl font-display font-bold text-text">{stats.totalLeads || 0}</p>
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
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 8).map((activity, index) => {
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
                                : activity.type === 'sent'
                                  ? 'bg-blue-100'
                                  : 'bg-purple-100'
                      }`}
                    >
                      {channelStyle ? (
                        <ChannelIcon
                          channel={activity.channel}
                          className={`w-4 h-4 ${channelStyle.color}`}
                        />
                      ) : activity.type === 'reply' ? (
                        <MessageSquare className="w-4 h-4 text-success" />
                      ) : activity.type === 'converted' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : activity.type === 'opened' ? (
                        <Eye className="w-4 h-4 text-amber-600" />
                      ) : activity.type === 'sent' ? (
                        <Mail className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{activity.message}</p>
                      <p className="text-xs text-text-muted truncate">{activity.details}</p>
                    </div>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {activity.timeAgo || ''}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">Aucune activite recente</p>
                <p className="text-xs text-text-muted mt-1">
                  Lancez vos campagnes pour voir l'activite ici
                </p>
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
          <span className="text-sm text-text-muted">{stats.totalMessages || 0} messages envoyes</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Email */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-text">Email</span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.byChannel?.email || 0}</p>
            <p className="text-xs text-text-muted mt-1">
              {stats.repliesByChannel?.email || 0} reponses
            </p>
          </div>

          {/* SMS */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-text">SMS</span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.byChannel?.sms || 0}</p>
            <p className="text-xs text-text-muted mt-1">
              {stats.repliesByChannel?.sms || 0} reponses
            </p>
          </div>

          {/* Instagram */}
          <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-text">Instagram</span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.byChannel?.instagram_dm || 0}</p>
            <p className="text-xs text-text-muted mt-1">
              {stats.repliesByChannel?.instagram_dm || 0} reponses
            </p>
          </div>

          {/* Voicemail */}
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-text">Vocal</span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.byChannel?.voicemail || 0}</p>
            <p className="text-xs text-text-muted mt-1">
              {stats.repliesByChannel?.voicemail || 0} rappels
            </p>
          </div>

          {/* Courrier */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-text">Courrier</span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.byChannel?.courrier || 0}</p>
            <p className="text-xs text-text-muted mt-1">
              {stats.repliesByChannel?.courrier || 0} scans QR
            </p>
          </div>
        </div>
      </motion.div>

      {/* Hot Prospects - Replied */}
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
              {hotProspects.length} reponses
            </span>
          </div>
          <Link to="/app/prospects" className="btn-ghost text-sm flex items-center gap-1">
            Voir tous
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {hotProspects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {hotProspects.map((prospect) => {
              const replyChannel = prospect.reply?.channel || 'email'
              const channelStyle = CHANNEL_STYLES[replyChannel] || CHANNEL_STYLES.email
              return (
                <div
                  key={prospect.id}
                  className="p-4 rounded-xl bg-surface-hover border border-accent/5 hover:border-success/30 hover:shadow-soft-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text truncate">{prospect.company}</p>
                      <p className="text-xs text-text-muted truncate">
                        {prospect.sector || prospect.industry} - {prospect.city}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${channelStyle.bg} border ${channelStyle.border}`}
                    >
                      <ChannelIcon
                        channel={replyChannel}
                        className={`w-3 h-3 ${channelStyle.color}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium ${channelStyle.color}`}>
                      Reponse via {channelStyle.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2 italic">
                    "{prospect.reply?.preview || prospect.reply?.content?.substring(0, 60) + '...'}"
                  </p>
                  <p className="text-xs text-text-muted mt-2">{prospect.reply?.timeAgo}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">Aucune reponse pour le moment</p>
            <p className="text-xs text-text-muted mt-1">
              Les prospects qui repondent apparaitront ici
            </p>
          </div>
        )}
      </motion.div>

      {/* Demo badge */}
      {isDemo && <DemoBadge />}
    </div>
  )
}

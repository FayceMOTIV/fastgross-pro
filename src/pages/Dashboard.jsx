import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { orderBy, limit } from 'firebase/firestore'
import DemoBanner, { DemoBadge } from '@/components/DemoBanner'
import { useDashboardStats, useLeads, useCollection } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import { useTour } from '@/components/OnboardingTour'
import { useDemo } from '@/contexts/DemoContext'
import {
  demoStats,
  demoDailyStats,
  demoClients,
  demoRecentActivity,
  transformProspectsToLeads,
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

// Format activity for display
const formatActivity = (activity) => {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return "A l'instant"
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
    return `Il y a ${Math.floor(seconds / 86400)}j`
  }

  return {
    ...activity,
    timeAgo: timeAgo(activity.timestamp),
  }
}

// Circular progress component - Light theme
function CircularProgress({ value, max, size = 200 }) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
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

export default function Dashboard() {
  const { isDemo } = useDemo()
  const { stats: realStats, loading: statsLoading } = useDashboardStats()
  const { leads: realLeads, loading: leadsLoading } = useLeads()
  const { data: activities } = useCollection('emailEvents', [
    orderBy('timestamp', 'desc'),
    limit(10),
  ])
  const { userProfile } = useAuth()
  const { setIsOpen } = useTour()

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
        totalLeads: demoStats.totalProspects,
        emailsSent: demoStats.totalEmailed,
        openRate: demoStats.avgOpenRate,
        replyRate: demoStats.avgReplyRate,
        hotLeads: demoClients.filter((c) => c.score >= 70).length,
        totalRevenue: demoStats.totalRevenueNum,
        thisMonthRevenue: demoStats.thisMonth.revenueNum,
        converted: demoStats.totalConverted,
        todayToContact: 37,
        todayContacted: 12,
        todayReplies: 4,
        todaySigned: 1,
        // Multichannel stats
        totalMessages: demoStats.totalMessages,
        byChannel: demoStats.byChannel,
        totalReplies: demoStats.totalReplies,
        repliesByChannel: demoStats.repliesByChannel,
      }
    : {
        ...realStats,
        todayToContact: 37,
        todayContacted: 12,
        todayReplies: 4,
        todaySigned: 1,
        totalMessages: 0,
        byChannel: { email: 0, sms: 0, instagram_dm: 0, voicemail: 0, courrier: 0 },
        totalReplies: 0,
        repliesByChannel: {},
      }

  // Get hot prospects (replied)
  const hotProspects = isDemo ? getHotProspects() : []

  const leads = isDemo ? transformProspectsToLeads(demoClients) : realLeads

  // Chart data - with null safety for demoDailyStats
  const defaultChartData = [
    { name: 'Lun', envoyes: 24, ouverts: 18, reponses: 3 },
    { name: 'Mar', envoyes: 30, ouverts: 22, reponses: 5 },
    { name: 'Mer', envoyes: 28, ouverts: 20, reponses: 4 },
    { name: 'Jeu', envoyes: 35, ouverts: 28, reponses: 7 },
    { name: 'Ven', envoyes: 32, ouverts: 25, reponses: 6 },
    { name: 'Sam', envoyes: 8, ouverts: 6, reponses: 1 },
    { name: 'Dim', envoyes: 0, ouverts: 0, reponses: 0 },
  ]

  const chartData = isDemo && Array.isArray(demoDailyStats) && demoDailyStats.length > 0
    ? demoDailyStats.slice(-7).map((d) => ({
        name: d?.dayLabel || '',
        envoyes: d?.emailed || 0,
        ouverts: d?.opened || 0,
        reponses: d?.replied || 0,
      }))
    : defaultChartData

  // Activity feed
  const recentActivities = isDemo
    ? demoRecentActivity.map(formatActivity)
    : (activities || []).map((event) => ({
        id: event.id,
        type: event.type,
        channel: event.channel || 'email',
        message: event.leadName ? `${event.leadName}` : 'Lead anonyme',
        details: event.email || event.subject,
        timestamp: event.timestamp,
        timeAgo: formatActivity({ timestamp: event.timestamp }).timeAgo,
      }))

  // Today's date
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Show loading state
  if (!isDemo && (statsLoading || leadsLoading)) {
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

      {/* Hero Section - Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 bg-gradient-to-br from-accent/5 via-purple-50/50 to-pink-50/30 border-accent/10"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left - Progress Ring */}
          <div className="flex-shrink-0">
            <CircularProgress value={stats.todayContacted} max={stats.todayToContact} size={180} />
          </div>

          {/* Right - Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-text-muted text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{today}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text mb-2">
              <span className="gradient-text">{stats.todayToContact}</span> personnes a contacter
            </h1>
            <p className="text-text-secondary mb-6">
              Vous avez deja contacte {stats.todayContacted} prospects aujourd'hui. Continuez comme
              ca !
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todayContacted}</p>
                  <p className="text-xs text-text-muted">Envoyes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todayReplies}</p>
                  <p className="text-xs text-text-muted">Reponses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{stats.todaySigned}</p>
                  <p className="text-xs text-text-muted">Signe</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <Link to="/app/prospects" className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                Lancer ma journee
              </Link>
              <Link to="/app/prospects" className="btn-secondary flex items-center gap-2">
                Voir ma liste
                <ArrowRight className="w-4 h-4" />
              </Link>
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
          <p className="text-2xl font-display font-bold text-text">{stats.emailsSent || 0}</p>
          <p className="text-xs text-text-muted mt-1">Emails envoyes</p>
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
              <Euro className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-success">
            {isDemo ? demoStats.totalRevenue : `${stats.totalRevenue || 0} EUR`}
          </p>
          <p className="text-xs text-text-muted mt-1">CA genere</p>
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
            {recentActivities.slice(0, 8).map((activity, index) => {
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
            })}
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
          <span className="text-sm text-text-muted">{stats.totalMessages} messages envoyes</span>
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
                        {prospect.sector} - {prospect.city}
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

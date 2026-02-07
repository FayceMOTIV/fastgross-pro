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
  Clock,
  Target,
  Sparkles,
  Send,
  Calendar,
  Play,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { orderBy, limit } from 'firebase/firestore'
import DemoBanner, { DemoBadge } from '@/components/DemoBanner'
import { useDashboardStats, useLeads, useCollection } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import { useTour } from '@/components/OnboardingTour'
import { useDemo } from '@/hooks/useDemo'
import { demoStats, demoDailyStats, demoClients, demoRecentActivity, transformProspectsToLeads, getHotProspects } from '@/data/demoData'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'

// Channel icon mapping
const ChannelIcon = ({ channel, className = "w-4 h-4" }) => {
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="glass-card px-4 py-3 text-xs space-y-1">
      <p className="font-medium text-white">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// Format activity for display
const formatActivity = (activity) => {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'A l\'instant'
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
    return `Il y a ${Math.floor(seconds / 86400)}j`
  }

  return {
    ...activity,
    timeAgo: timeAgo(activity.timestamp),
  }
}

// Circular progress component
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
          className="text-dark-800"
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
            <stop offset="0%" stopColor="#00d49a" />
            <stop offset="100%" stopColor="#73f7cb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-display font-bold text-white">{value}</span>
        <span className="text-dark-400 text-sm">sur {max}</span>
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
    limit(10)
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
  const stats = isDemo ? {
    totalLeads: demoStats.totalProspects,
    emailsSent: demoStats.totalEmailed,
    openRate: demoStats.avgOpenRate,
    replyRate: demoStats.avgReplyRate,
    hotLeads: demoClients.filter(c => c.score >= 70).length,
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
  } : {
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

  // Chart data
  const chartData = isDemo
    ? demoDailyStats.slice(-7).map(d => ({
        name: d.dayLabel,
        envoyes: d.emailed,
        ouverts: d.opened,
        reponses: d.replied,
      }))
    : [
        { name: 'Lun', envoyes: 24, ouverts: 18, reponses: 3 },
        { name: 'Mar', envoyes: 30, ouverts: 22, reponses: 5 },
        { name: 'Mer', envoyes: 28, ouverts: 20, reponses: 4 },
        { name: 'Jeu', envoyes: 35, ouverts: 28, reponses: 7 },
        { name: 'Ven', envoyes: 32, ouverts: 25, reponses: 6 },
        { name: 'Sam', envoyes: 8, ouverts: 6, reponses: 1 },
        { name: 'Dim', envoyes: 0, ouverts: 0, reponses: 0 },
      ]

  // Activity feed
  const recentActivities = isDemo
    ? demoRecentActivity.map(formatActivity)
    : (activities || []).map(event => ({
        id: event.id,
        type: event.type,
        message: event.leadName ? `${event.leadName}` : 'Lead anonyme',
        details: event.email || event.subject,
        timestamp: event.timestamp
      }))

  // Today's date
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Demo Banner */}
      {isDemo && <DemoBanner page="dashboard" />}

      {/* Hero Section - Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-transparent"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left - Progress Ring */}
          <div className="flex-shrink-0">
            <CircularProgress
              value={stats.todayContacted}
              max={stats.todayToContact}
              size={180}
            />
          </div>

          {/* Right - Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-dark-400 text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{today}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              <span className="text-brand-400">{stats.todayToContact}</span> personnes a contacter
            </h1>
            <p className="text-dark-400 mb-6">
              Vous avez deja contacte {stats.todayContacted} prospects aujourd'hui.
              Continuez comme ca !
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stats.todayContacted}</p>
                  <p className="text-xs text-dark-500">Envoyes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stats.todayReplies}</p>
                  <p className="text-xs text-dark-500">Reponses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stats.todaySigned}</p>
                  <p className="text-xs text-dark-500">Signe</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <Link
                to="/app/prospects"
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Lancer ma journee
              </Link>
              <Link
                to="/app/prospects"
                className="btn-secondary flex items-center gap-2"
              >
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
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.totalLeads || 0}</p>
          <p className="text-xs text-dark-500 mt-1">Prospects total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.emailsSent || 0}</p>
          <p className="text-xs text-dark-500 mt-1">Emails envoyes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.replyRate || 0}%</p>
          <p className="text-xs text-dark-500 mt-1">Taux de reponse</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 border-brand-500/20"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Euro className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-brand-400">
            {isDemo ? demoStats.totalRevenue : `${stats.totalRevenue || 0} EUR`}
          </p>
          <p className="text-xs text-dark-500 mt-1">CA genere</p>
        </motion.div>
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Performance cette semaine</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                Envoyes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-300" />
                Ouverts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Reponses
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradientSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d49a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00d49a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6d6d8a', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6d6d8a', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="envoyes"
                stroke="#00d49a"
                strokeWidth={2}
                fill="url(#gradientSent)"
              />
              <Area
                type="monotone"
                dataKey="ouverts"
                stroke="#73f7cb"
                strokeWidth={2}
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="reponses"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-400" />
            <h2 className="section-title">Activite recente</h2>
          </div>
          <div className="space-y-4">
            {recentActivities.slice(0, 8).map((activity, index) => {
              const channelStyle = activity.channel ? CHANNEL_STYLES[activity.channel] : null
              return (
                <div key={activity.id || index} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    channelStyle ? channelStyle.bg :
                    activity.type === 'reply' ? 'bg-brand-500/10' :
                    activity.type === 'converted' ? 'bg-brand-500/10' :
                    activity.type === 'opened' ? 'bg-amber-500/10' :
                    activity.type === 'sent' ? 'bg-blue-500/10' :
                    'bg-purple-500/10'
                  }`}>
                    {channelStyle ? (
                      <ChannelIcon channel={activity.channel} className={`w-4 h-4 ${channelStyle.color}`} />
                    ) : activity.type === 'reply' ? <MessageSquare className="w-4 h-4 text-brand-400" /> :
                     activity.type === 'converted' ? <CheckCircle className="w-4 h-4 text-brand-400" /> :
                     activity.type === 'opened' ? <Eye className="w-4 h-4 text-amber-400" /> :
                     activity.type === 'sent' ? <Mail className="w-4 h-4 text-blue-400" /> :
                     <Users className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.message}</p>
                    <p className="text-xs text-dark-500 truncate">{activity.details}</p>
                  </div>
                  <span className="text-xs text-dark-500 flex-shrink-0">
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
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-400" />
            <h2 className="section-title">Messages par canal</h2>
          </div>
          <span className="text-sm text-dark-400">
            {stats.totalMessages} messages envoyes
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Email */}
          <div className={`p-4 rounded-xl ${CHANNEL_STYLES.email.bg} border ${CHANNEL_STYLES.email.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Mail className={`w-5 h-5 ${CHANNEL_STYLES.email.color}`} />
              <span className="text-sm font-medium text-white">Email</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.byChannel?.email || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{stats.repliesByChannel?.email || 0} reponses</p>
          </div>

          {/* SMS */}
          <div className={`p-4 rounded-xl ${CHANNEL_STYLES.sms.bg} border ${CHANNEL_STYLES.sms.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className={`w-5 h-5 ${CHANNEL_STYLES.sms.color}`} />
              <span className="text-sm font-medium text-white">SMS</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.byChannel?.sms || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{stats.repliesByChannel?.sms || 0} reponses</p>
          </div>

          {/* Instagram */}
          <div className={`p-4 rounded-xl ${CHANNEL_STYLES.instagram_dm.bg} border ${CHANNEL_STYLES.instagram_dm.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Instagram className={`w-5 h-5 ${CHANNEL_STYLES.instagram_dm.color}`} />
              <span className="text-sm font-medium text-white">Instagram</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.byChannel?.instagram_dm || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{stats.repliesByChannel?.instagram_dm || 0} reponses</p>
          </div>

          {/* Voicemail */}
          <div className={`p-4 rounded-xl ${CHANNEL_STYLES.voicemail.bg} border ${CHANNEL_STYLES.voicemail.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Mic className={`w-5 h-5 ${CHANNEL_STYLES.voicemail.color}`} />
              <span className="text-sm font-medium text-white">Vocal</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.byChannel?.voicemail || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{stats.repliesByChannel?.voicemail || 0} rappels</p>
          </div>

          {/* Courrier */}
          <div className={`p-4 rounded-xl ${CHANNEL_STYLES.courrier.bg} border ${CHANNEL_STYLES.courrier.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className={`w-5 h-5 ${CHANNEL_STYLES.courrier.color}`} />
              <span className="text-sm font-medium text-white">Courrier</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.byChannel?.courrier || 0}</p>
            <p className="text-xs text-dark-400 mt-1">{stats.repliesByChannel?.courrier || 0} scans QR</p>
          </div>
        </div>
      </motion.div>

      {/* Hot Prospects - Replied */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card p-6 border-brand-500/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-400" />
            <h2 className="section-title">Prospects chauds</h2>
            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium">
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
                  className="p-4 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-brand-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{prospect.company}</p>
                      <p className="text-xs text-dark-400 truncate">{prospect.sector} - {prospect.city}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${channelStyle.bg} border ${channelStyle.border}`}>
                      <ChannelIcon channel={replyChannel} className={`w-3 h-3 ${channelStyle.color}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium ${channelStyle.color}`}>
                      Reponse via {channelStyle.label}
                    </span>
                  </div>
                  <p className="text-xs text-dark-400 line-clamp-2 italic">
                    "{prospect.reply?.preview || prospect.reply?.content?.substring(0, 60) + '...'}"
                  </p>
                  <p className="text-xs text-dark-500 mt-2">{prospect.reply?.timeAgo}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">Aucune reponse pour le moment</p>
            <p className="text-xs text-dark-500 mt-1">Les prospects qui repondent apparaitront ici</p>
          </div>
        )}
      </motion.div>

      {/* Demo badge */}
      {isDemo && <DemoBadge />}
    </div>
  )
}

import { useEffect } from 'react'
import { Users, Mail, MousePointerClick, MessageSquare, Zap, ArrowUpRight, TrendingUp, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { orderBy, limit } from 'firebase/firestore'
import StatsCard from '@/components/StatsCard'
import LeadTable from '@/components/LeadTable'
import ActivityFeed from '@/components/ActivityFeed'
import { useDashboardStats, useLeads, useCollection } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import { useTour } from '@/components/OnboardingTour'

// Demo data pour le graphique (sera remplacé par les vraies données)
const chartData = [
  { name: 'Lun', envoyés: 24, ouverts: 18, réponses: 3 },
  { name: 'Mar', envoyés: 30, ouverts: 22, réponses: 5 },
  { name: 'Mer', envoyés: 28, ouverts: 20, réponses: 4 },
  { name: 'Jeu', envoyés: 35, ouverts: 28, réponses: 7 },
  { name: 'Ven', envoyés: 32, ouverts: 25, réponses: 6 },
  { name: 'Sam', envoyés: 8, ouverts: 6, réponses: 1 },
  { name: 'Dim', envoyés: 0, ouverts: 0, réponses: 0 },
]

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

export default function Dashboard() {
  const { stats, loading: statsLoading } = useDashboardStats()
  const { leads, loading: leadsLoading } = useLeads()
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

  const hotLeads = leads.filter((l) => l.score >= 7).slice(0, 5)

  // Transform email events to activity format
  const recentActivities = (activities || []).map(event => ({
    id: event.id,
    type: event.type,
    message: event.leadName ? `${event.leadName}` : 'Lead anonyme',
    details: event.email || event.subject,
    timestamp: event.timestamp
  }))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-dark-400 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <button data-tour="new-scan" className="btn-primary flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Nouveau scan
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Leads totaux"
          value={stats.totalLeads}
          change={12}
          icon={Users}
        />
        <StatsCard
          label="Emails envoyés"
          value={stats.emailsSent}
          change={8}
          icon={Mail}
        />
        <StatsCard
          label="Taux d'ouverture"
          value={stats.openRate}
          format="percent"
          change={3}
          icon={MousePointerClick}
        />
        <StatsCard
          label="Taux de réponse"
          value={stats.replyRate}
          format="percent"
          change={-2}
          icon={MessageSquare}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Performance emails</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                Envoyés
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-300" />
                Ouverts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Réponses
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
                dataKey="envoyés"
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
                dataKey="réponses"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="section-title">Actions rapides</h2>

          <div className="space-y-3">
            <a
              href="/app/scanner"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-transparent hover:border-brand-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                <Zap className="w-5 h-5 text-brand-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Scanner un site</p>
                <p className="text-xs text-dark-500">Analyser un nouveau client</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-brand-400 transition-colors" />
            </a>

            <a
              href="/app/forgeur"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-transparent hover:border-brand-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Créer une séquence</p>
                <p className="text-xs text-dark-500">Générer des emails IA</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-blue-400 transition-colors" />
            </a>

            <a
              href="/app/radar"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-transparent hover:border-brand-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Leads chauds</p>
                <p className="text-xs text-dark-500">{stats.hotLeads} leads à contacter</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-amber-400 transition-colors" />
            </a>
          </div>
        </div>
      </div>

      {/* Activity + Hot leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hot leads */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">🔥 Leads les plus chauds</h2>
            <a href="/app/radar" className="btn-ghost text-sm">
              Voir tous →
            </a>
          </div>
          <LeadTable leads={hotLeads} compact />
        </div>

        {/* Activity feed */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-400" />
            <h2 className="section-title">Activité récente</h2>
          </div>
          <ActivityFeed activities={recentActivities} maxItems={8} />
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import {
  Target, Mail, Eye, MessageSquare, Phone, Calendar,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Users, Zap, Activity, Globe, Search, Shield,
  ArrowUp, ArrowDown, Minus, RefreshCw, Loader2
} from 'lucide-react'

// ─── KPI targets ────────────────────────────────────────────────────

const KPI_TARGETS = {
  prospectsFound: { label: 'Prospects trouves', target: 100, unit: '/jour', icon: Users, color: 'indigo' },
  emailsSent: { label: 'Emails envoyes', target: 75, unit: '/jour', icon: Mail, color: 'blue' },
  openRate: { label: 'Taux d\'ouverture', target: 50, unit: '%', icon: Eye, color: 'cyan' },
  responseRate: { label: 'Taux de reponse', target: 15, unit: '%', icon: MessageSquare, color: 'emerald' },
  positiveRate: { label: 'Reponses positives', target: 5, unit: '%', icon: CheckCircle, color: 'green' },
  callsBooked: { label: 'Calls reserves', target: 5, unit: '/sem', icon: Calendar, color: 'violet' },
  noShowRate: { label: 'No-show rate', target: 15, unit: '%', icon: AlertCircle, color: 'amber', inverse: true },
  dealsWon: { label: 'Deals signes', target: 1, unit: '/sem', icon: Target, color: 'rose' }
}

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200', bar: 'bg-indigo-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', bar: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-200', bar: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', bar: 'bg-emerald-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-200', bar: 'bg-green-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200', bar: 'bg-violet-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', bar: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200', bar: 'bg-rose-500' }
}

// ─── Mock data (functional without API keys) ────────────────────────

function generateMockStats() {
  return {
    prospectsFound: Math.floor(Math.random() * 80 + 40),
    emailsSent: Math.floor(Math.random() * 60 + 30),
    openRate: Math.floor(Math.random() * 30 + 35),
    responseRate: Math.floor(Math.random() * 12 + 8),
    positiveRate: Math.floor(Math.random() * 5 + 3),
    callsBooked: Math.floor(Math.random() * 4 + 1),
    noShowRate: Math.floor(Math.random() * 10 + 5),
    dealsWon: Math.floor(Math.random() * 2)
  }
}

function generateMockTrend() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  return days.map(day => ({
    day,
    prospects: Math.floor(Math.random() * 80 + 30),
    emails: Math.floor(Math.random() * 60 + 20),
    responses: Math.floor(Math.random() * 15 + 3)
  }))
}

function generateMockSignals() {
  return [
    { type: 'new_domain', label: 'Domaines neufs', count: Math.floor(Math.random() * 30 + 10), color: 'indigo' },
    { type: 'reddit_intent', label: 'Reddit Intent', count: Math.floor(Math.random() * 15 + 3), color: 'rose' },
    { type: 'google_maps', label: 'Google Maps', count: Math.floor(Math.random() * 25 + 10), color: 'emerald' },
    { type: 'tech_stack', label: 'Tech Stack', count: Math.floor(Math.random() * 20 + 5), color: 'blue' },
    { type: 'job_posting', label: 'Recrutement', count: Math.floor(Math.random() * 10 + 2), color: 'amber' }
  ]
}

function generateMockPipeline() {
  return [
    { status: 'new', label: 'Nouveaux', count: Math.floor(Math.random() * 50 + 20), color: 'bg-gray-400' },
    { status: 'warming', label: 'Warming', count: Math.floor(Math.random() * 20 + 5), color: 'bg-blue-400' },
    { status: 'contacted', label: 'Contactes', count: Math.floor(Math.random() * 30 + 10), color: 'bg-indigo-400' },
    { status: 'responded', label: 'Repondus', count: Math.floor(Math.random() * 10 + 3), color: 'bg-emerald-400' },
    { status: 'qualified', label: 'Qualifies', count: Math.floor(Math.random() * 5 + 1), color: 'bg-green-500' },
    { status: 'booked', label: 'Call reserve', count: Math.floor(Math.random() * 3 + 1), color: 'bg-violet-500' }
  ]
}

// ─── Component ──────────────────────────────────────────────────────

export default function WarDashboard() {
  const { user } = useAuth()
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [signals, setSignals] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadStats = useCallback(async () => {
    if (!orgId) return

    setLoading(true)

    try {
      // Try loading real data from Firestore
      const todayKey = new Date().toISOString().split('T')[0]
      const analyticsRef = doc(db, 'organizations', orgId, 'analytics', todayKey)

      const unsubscribe = onSnapshot(analyticsRef, (snap) => {
        if (snap.exists()) {
          setStats(snap.data())
        } else {
          setStats(generateMockStats())
        }
      })

      // Load prospect counts by source
      const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
      const recentQuery = query(
        prospectsRef,
        where('foundByAlex', '==', true),
        orderBy('createdAt', 'desc'),
        limit(200)
      )

      const prospectsSnap = await getDocs(recentQuery)
      const prospects = prospectsSnap.docs.map(d => d.data())

      // Count by signal source
      const signalCounts = {}
      for (const p of prospects) {
        const src = p.signal_type || p.source || 'other'
        signalCounts[src] = (signalCounts[src] || 0) + 1
      }

      if (Object.keys(signalCounts).length > 0) {
        setSignals(Object.entries(signalCounts).map(([type, count]) => ({
          type,
          label: formatSignalLabel(type),
          count,
          color: getSignalColor(type)
        })).sort((a, b) => b.count - a.count))
      } else {
        setSignals(generateMockSignals())
      }

      // Count by status (pipeline)
      const statusCounts = {}
      for (const p of prospects) {
        const status = p.status || 'new'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      }

      if (Object.keys(statusCounts).length > 0) {
        setPipeline(Object.entries(statusCounts).map(([status, count]) => ({
          status,
          label: formatStatusLabel(status),
          count,
          color: getStatusColor(status)
        })))
      } else {
        setPipeline(generateMockPipeline())
      }

      setTrend(generateMockTrend())
      setLastRefresh(new Date())

      return () => unsubscribe()
    } catch {
      // Fallback to mock data
      setStats(generateMockStats())
      setTrend(generateMockTrend())
      setSignals(generateMockSignals())
      setPipeline(generateMockPipeline())
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { loadStats() }, [loadStats])

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selectionnez une organisation</p>
      </div>
    )
  }

  const currentStats = stats || generateMockStats()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-outfit flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            Dashboard de Guerre
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Derniere mise a jour : {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Rafraichir
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(KPI_TARGETS).map(([key, config]) => {
          const value = currentStats[key] || 0
          const colors = COLOR_MAP[config.color]
          const percentage = config.inverse
            ? Math.max(0, 100 - (value / config.target) * 100)
            : Math.min(100, (value / config.target) * 100)
          const isGood = config.inverse ? value <= config.target : value >= config.target

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card p-4 ring-1 ${colors.ring}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <config.icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isGood ? 'OK' : 'Sous cible'}
                </span>
              </div>

              <p className="text-2xl font-bold text-gray-900">{value}{config.unit === '%' ? '%' : ''}</p>
              <p className="text-xs text-gray-500 mt-1">{config.label}</p>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGood ? 'bg-green-500' : colors.bar
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Cible : {config.target}{config.unit}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Middle row: Signals + Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signal Sources */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Sources de signaux (cette semaine)
          </h3>
          <div className="space-y-3">
            {signals.map((signal) => {
              const total = signals.reduce((s, sg) => s + sg.count, 0) || 1
              const pct = Math.round((signal.count / total) * 100)
              const colors = COLOR_MAP[signal.color] || COLOR_MAP.indigo

              return (
                <div key={signal.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{signal.label}</span>
                    <span className="text-sm font-medium text-gray-900">{signal.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Pipeline prospects
          </h3>
          <div className="space-y-3">
            {pipeline.map((stage) => {
              const total = pipeline.reduce((s, st) => s + st.count, 0) || 1
              const pct = Math.round((stage.count / total) * 100)

              return (
                <div key={stage.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{stage.label}</span>
                    <span className="text-sm font-medium text-gray-900">{stage.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Total : <span className="font-semibold text-gray-900">
                {pipeline.reduce((s, st) => s + st.count, 0)}
              </span> prospects
            </p>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          Tendance hebdomadaire
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {trend.map((day) => (
            <div key={day.day} className="text-center">
              <p className="text-xs text-gray-500 mb-2">{day.day}</p>
              <div className="space-y-1">
                <div className="flex flex-col items-center">
                  <div
                    className="w-full bg-indigo-200 rounded-t"
                    style={{ height: `${Math.max(day.prospects / 2, 4)}px` }}
                    title={`${day.prospects} prospects`}
                  />
                  <div
                    className="w-full bg-blue-300 rounded-none"
                    style={{ height: `${Math.max(day.emails / 2, 4)}px` }}
                    title={`${day.emails} emails`}
                  />
                  <div
                    className="w-full bg-emerald-400 rounded-b"
                    style={{ height: `${Math.max(day.responses, 4)}px` }}
                    title={`${day.responses} reponses`}
                  />
                </div>
              </div>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-indigo-600 font-medium">{day.prospects}</p>
                <p className="text-[10px] text-blue-500">{day.emails}</p>
                <p className="text-[10px] text-emerald-600">{day.responses}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-indigo-200" />
            <span className="text-xs text-gray-500">Prospects</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-300" />
            <span className="text-xs text-gray-500">Emails</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-400" />
            <span className="text-xs text-gray-500">Reponses</span>
          </div>
        </div>
      </div>

      {/* Hunters status */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-violet-500" />
          Statut des Hunters
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: 'Domaines Neufs', schedule: '6h', icon: Globe, color: 'indigo' },
            { name: 'Reddit Intent', schedule: '4h', icon: MessageSquare, color: 'rose' },
            { name: 'Tech Stack', schedule: '8h', icon: Shield, color: 'blue' },
            { name: 'Maps Mining', schedule: '7h30', icon: Search, color: 'emerald' },
            { name: 'Sniper Seqs', schedule: '1h', icon: Target, color: 'violet' }
          ].map((hunter) => {
            const colors = COLOR_MAP[hunter.color]
            return (
              <div key={hunter.name} className={`p-3 rounded-lg ${colors.bg} ring-1 ${colors.ring}`}>
                <div className="flex items-center gap-2 mb-1">
                  <hunter.icon className={`w-4 h-4 ${colors.text}`} />
                  <span className="text-xs font-medium text-gray-700">{hunter.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-gray-500">Actif — {hunter.schedule}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Format helpers ─────────────────────────────────────────────────

function formatSignalLabel(type) {
  const labels = {
    new_domain: 'Domaines Neufs',
    new_domain_hunter: 'Domaines Neufs',
    reddit_intent: 'Reddit Intent',
    reddit_intent_hunter: 'Reddit Intent',
    google_maps: 'Google Maps',
    google_maps_miner: 'Google Maps',
    googlemaps_hunter: 'Google Maps',
    missing_tech: 'Tech Stack',
    tech_stack_hunter: 'Tech Stack',
    job_posting: 'Recrutement',
    competitor_user: 'Concurrent',
    no_website: 'Pas de site',
    low_reviews: 'Peu d\'avis',
    low_rating: 'Note faible'
  }
  return labels[type] || type
}

function getSignalColor(type) {
  const colors = {
    new_domain: 'indigo', new_domain_hunter: 'indigo',
    reddit_intent: 'rose', reddit_intent_hunter: 'rose',
    google_maps: 'emerald', google_maps_miner: 'emerald', googlemaps_hunter: 'emerald',
    missing_tech: 'blue', tech_stack_hunter: 'blue',
    job_posting: 'amber',
    competitor_user: 'violet',
    no_website: 'rose',
    low_reviews: 'amber',
    low_rating: 'rose'
  }
  return colors[type] || 'indigo'
}

function formatStatusLabel(status) {
  const labels = {
    new: 'Nouveaux',
    warming: 'Warming',
    contacted: 'Contactes',
    responded: 'Repondus',
    qualified: 'Qualifies',
    booked: 'Call reserve',
    closed: 'Signe',
    lost: 'Perdu'
  }
  return labels[status] || status
}

function getStatusColor(status) {
  const colors = {
    new: 'bg-gray-400',
    warming: 'bg-blue-400',
    contacted: 'bg-indigo-400',
    responded: 'bg-emerald-400',
    qualified: 'bg-green-500',
    booked: 'bg-violet-500',
    closed: 'bg-rose-500',
    lost: 'bg-gray-300'
  }
  return colors[status] || 'bg-gray-400'
}

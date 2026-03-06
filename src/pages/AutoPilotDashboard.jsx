import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Rocket,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  Send,
  Phone,
  Mail,
  Instagram,
  ExternalLink,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Zap,
  Target,
  Award,
  ArrowRight,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CalendarPlus,
} from 'lucide-react'

export default function AutoPilotDashboard() {
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayProspects: 0,
    totalContacted: 0,
    positiveResponses: 0,
    meetingsScheduled: 0,
    conversionRate: 0,
  })
  const [hotProspects, setHotProspects] = useState([])
  const [conversations, setConversations] = useState([])
  const [config, setConfig] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    if (currentOrg?.id) {
      loadDashboard()
      const unsubscribe = subscribeToConversations()
      return () => unsubscribe && unsubscribe()
    }
  }, [currentOrg?.id])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      await Promise.all([loadStats(), loadHotProspects(), loadConfig()])
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todaySnap, contactedSnap, positiveSnap, meetingsSnap] = await Promise.all([
      getDocs(query(prospectsRef, where('createdAt', '>=', Timestamp.fromDate(today)))),
      getDocs(query(prospectsRef, where('status', '==', 'contacted'))),
      getDocs(query(prospectsRef, where('responseType', '==', 'positive'))),
      getDocs(query(prospectsRef, where('meetingScheduled', '==', true))),
    ])

    const contacted = contactedSnap.size
    const positive = positiveSnap.size

    setStats({
      todayProspects: todaySnap.size,
      totalContacted: contacted,
      positiveResponses: positive,
      meetingsScheduled: meetingsSnap.size,
      conversionRate: contacted > 0 ? Math.round((positive / contacted) * 100) : 0,
    })
  }

  const loadHotProspects = async () => {
    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')

    // Get prospects with positive responses or high scores
    const hotSnap = await getDocs(
      query(
        prospectsRef,
        where('responseType', '==', 'positive'),
        orderBy('respondedAt', 'desc'),
        limit(10)
      )
    )

    setHotProspects(hotSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  const loadConfig = async () => {
    try {
      const configDocRef = doc(db, 'organizations', currentOrg.id, 'autoPilotConfig', 'main')
      const configSnapshot = await getDoc(configDocRef)
      if (configSnapshot.exists()) {
        setConfig(configSnapshot.data())
      }
    } catch (error) {
      console.error('Config load error:', error)
    }
  }

  const subscribeToConversations = () => {
    const conversationsRef = collection(db, 'organizations', currentOrg.id, 'conversations')

    return onSnapshot(
      query(conversationsRef, orderBy('lastMessageAt', 'desc'), limit(20)),
      (snapshot) => {
        setConversations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
      }
    )
  }

  const handleScheduleMeeting = async (prospectId) => {
    setActionLoading((prev) => ({ ...prev, [prospectId]: 'meeting' }))
    try {
      const scheduleMeetingFn = httpsCallable(functions, 'scheduleMeetingWithProspect')
      await scheduleMeetingFn({ prospectId, orgId: currentOrg.id })
      loadHotProspects()
    } catch (error) {
      console.error('Schedule meeting error:', error)
      alert('Erreur: ' + error.message)
    } finally {
      setActionLoading((prev) => ({ ...prev, [prospectId]: null }))
    }
  }

  const handleSendMessage = async (prospectId, channel) => {
    setActionLoading((prev) => ({ ...prev, [prospectId]: 'send' }))
    try {
      const sendFn = httpsCallable(functions, 'sendAutoPilotMessage')
      await sendFn({ prospectId, orgId: currentOrg.id, channel })
      loadHotProspects()
    } catch (error) {
      console.error('Send error:', error)
      alert('Erreur: ' + error.message)
    } finally {
      setActionLoading((prev) => ({ ...prev, [prospectId]: null }))
    }
  }

  const toggleAutoPilotState = async () => {
    if (!config) return
    try {
      const toggleFn = httpsCallable(functions, 'toggleAutoPilot')
      await toggleFn({ orgId: currentOrg.id, enabled: !config.enabled })
      setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
    } catch (error) {
      console.error('Toggle error:', error)
      // Fallback to direct update
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'autoPilotConfig', 'main'), {
        enabled: !config.enabled,
      })
      setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">AutoPilot non configure</h2>
          <p className="text-white/60 mb-8">
            Configurez votre machine a clients en quelques minutes.
          </p>
          <button
            onClick={() => navigate('/app/autopilot/setup')}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
          >
            Configurer l'AutoPilot
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AutoPilot</h1>
                <p className="text-sm text-white/60">
                  {config.enabled ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Actif - {config.prospectsPerDay} prospects/jour
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      En pause
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboard}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/app/autopilot/setup')}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={toggleAutoPilotState}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  config.enabled
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {config.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {config.enabled ? 'Pause' : 'Reprendre'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatsCard icon={Users} label="Aujourd'hui" value={stats.todayProspects} color="blue" />
          <StatsCard icon={Send} label="Contactes" value={stats.totalContacted} color="purple" />
          <StatsCard
            icon={ThumbsUp}
            label="Interesses"
            value={stats.positiveResponses}
            color="green"
          />
          <StatsCard icon={Calendar} label="RDV" value={stats.meetingsScheduled} color="orange" />
          <StatsCard
            icon={TrendingUp}
            label="Conversion"
            value={`${stats.conversionRate}%`}
            color="pink"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hot Prospects */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Prospects Chauds</h2>
                      <p className="text-sm text-white/60">Ils veulent travailler avec vous</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                    {hotProspects.length} nouveaux
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {hotProspects.length === 0 ? (
                  <div className="p-12 text-center">
                    <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">Pas encore de prospects chauds</p>
                    <p className="text-sm text-white/40">Les reponses positives apparaitront ici</p>
                  </div>
                ) : (
                  hotProspects.map((prospect) => (
                    <ProspectCard
                      key={prospect.id}
                      prospect={prospect}
                      onScheduleMeeting={() => handleScheduleMeeting(prospect.id)}
                      onSendMessage={(channel) => handleSendMessage(prospect.id, channel)}
                      loading={actionLoading[prospect.id]}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Live Conversations */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Conversations</h2>
                    <p className="text-sm text-white/60">En temps reel</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/60">Aucune conversation</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {conversations.map((conv) => (
                      <ConversationItem key={conv.id} conversation={conv} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="font-semibold text-white mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/app/autopilot/prospects')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-400" />
                    Voir tous les prospects
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                </button>

                <button
                  onClick={() => navigate('/app/autopilot/setup')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Modifier l'avatar client
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                </button>

                <button
                  onClick={() => navigate('/app/performance')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Voir les statistiques
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Insight IA</h3>
              <p className="text-white/80">
                Vos prospects dans le secteur <strong>{config.avatarIndustry || 'tech'}</strong>{' '}
                repondent mieux le <strong>mardi et mercredi matin</strong>. Le taux de reponse est
                40% plus eleve quand le message mentionne leurs <strong>reseaux sociaux</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/20 text-purple-400',
    green: 'from-green-500/20 to-green-600/20 text-green-400',
    orange: 'from-orange-500/20 to-orange-600/20 text-orange-400',
    pink: 'from-pink-500/20 to-pink-600/20 text-pink-400',
  }

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} backdrop-blur-xl border border-white/10`}
    >
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/60">{label}</p>
    </div>
  )
}

function ProspectCard({ prospect, onScheduleMeeting, onSendMessage, loading }) {
  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'whatsapp':
        return Phone
      case 'instagram':
        return Instagram
      case 'email':
        return Mail
      default:
        return MessageSquare
    }
  }

  const ChannelIcon = getChannelIcon(prospect.channel)

  return (
    <div className="p-6 hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{prospect.name || prospect.company}</h3>
            <p className="text-sm text-white/60">
              {prospect.industry} • {prospect.location}
            </p>
            {prospect.respondedAt && (
              <p className="text-xs text-green-400 mt-1">
                A repondu{' '}
                {formatDistanceToNow(prospect.respondedAt.toDate(), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            Interesse
          </span>
          <ChannelIcon className="w-4 h-4 text-white/40" />
        </div>
      </div>

      {prospect.lastMessage && (
        <div className="p-3 rounded-lg bg-white/5 mb-4">
          <p className="text-sm text-white/80 italic">"{prospect.lastMessage}"</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onScheduleMeeting}
          disabled={loading === 'meeting' || prospect.meetingScheduled}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {loading === 'meeting' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : prospect.meetingScheduled ? (
            <>
              <CheckCircle className="w-4 h-4" />
              RDV planifie
            </>
          ) : (
            <>
              <CalendarPlus className="w-4 h-4" />
              Planifier RDV
            </>
          )}
        </button>

        <button
          onClick={() => onSendMessage(prospect.channel)}
          disabled={loading === 'send'}
          className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          {loading === 'send' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>

        {prospect.website && (
          <a
            href={`https://${prospect.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}

function ConversationItem({ conversation }) {
  const getResponseIcon = (type) => {
    switch (type) {
      case 'positive':
        return <ThumbsUp className="w-4 h-4 text-green-400" />
      case 'negative':
        return <ThumbsDown className="w-4 h-4 text-red-400" />
      case 'question':
        return <HelpCircle className="w-4 h-4 text-yellow-400" />
      default:
        return <MessageSquare className="w-4 h-4 text-white/40" />
    }
  }

  return (
    <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          {getResponseIcon(conversation.responseType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{conversation.prospectName}</p>
          <p className="text-xs text-white/60 truncate">{conversation.lastMessage}</p>
          {conversation.lastMessageAt && (
            <p className="text-xs text-white/40 mt-1">
              {formatDistanceToNow(conversation.lastMessageAt.toDate(), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

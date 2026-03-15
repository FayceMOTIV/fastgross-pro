/**
 * AlexActivityFeed — Real-time activity feed for Alex actions
 *
 * Listens to organizations/{orgId}/alexActivity via onSnapshot.
 * Shows search, qualify, send, signal, error events with icons + relative time.
 */
import { useState, useEffect, useMemo } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  Search, UserCheck, Mail, MessageSquare, Phone, Zap,
  Briefcase, AlertTriangle, BarChart3, Radio, ClipboardList,
  FileText, Flame, Bot, RotateCcw, Activity,
} from 'lucide-react'

const TYPE_CONFIG = {
  search:            { icon: Search,        color: 'text-blue-500',   bg: 'bg-blue-50' },
  qualify:           { icon: UserCheck,      color: 'text-emerald-500', bg: 'bg-emerald-50' },
  email_sent:        { icon: Mail,           color: 'text-indigo-500', bg: 'bg-indigo-50' },
  sms_sent:          { icon: MessageSquare,  color: 'text-teal-500',  bg: 'bg-teal-50' },
  whatsapp_sent:     { icon: MessageSquare,  color: 'text-green-500', bg: 'bg-green-50' },
  voice_call:        { icon: Phone,          color: 'text-purple-500', bg: 'bg-purple-50' },
  signal_detected:   { icon: Zap,            color: 'text-amber-500', bg: 'bg-amber-50' },
  job_change:        { icon: Briefcase,      color: 'text-orange-500', bg: 'bg-orange-50' },
  error:             { icon: AlertTriangle,  color: 'text-red-500',   bg: 'bg-red-50' },
  scoring:           { icon: BarChart3,      color: 'text-cyan-500',  bg: 'bg-cyan-50' },
  monitor:           { icon: Radio,          color: 'text-violet-500', bg: 'bg-violet-50' },
  mission_parsed:    { icon: ClipboardList,  color: 'text-pink-500',  bg: 'bg-pink-50' },
  daily_report:      { icon: FileText,       color: 'text-slate-500', bg: 'bg-slate-50' },
  hot_lead:          { icon: Flame,          color: 'text-orange-500', bg: 'bg-orange-50' },
  autonomous_action: { icon: Bot,            color: 'text-indigo-500', bg: 'bg-indigo-50' },
  rescue:            { icon: RotateCcw,      color: 'text-amber-500', bg: 'bg-amber-50' },
  reply_sent:        { icon: Mail,           color: 'text-green-500', bg: 'bg-green-50' },
}

const TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'search', label: 'Recherches', types: ['search', 'qualify'] },
  { key: 'send', label: 'Envois', types: ['email_sent', 'sms_sent', 'whatsapp_sent', 'voice_call', 'reply_sent'] },
  { key: 'signal', label: 'Signaux', types: ['signal_detected', 'job_change', 'hot_lead'] },
  { key: 'error', label: 'Erreurs', types: ['error'] },
]

function relativeTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'A l\'instant'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  return `Il y a ${Math.floor(seconds / 86400)}j`
}

export default function AlexActivityFeed() {
  const { currentOrg } = useOrg()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'alexActivity'),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('AlexActivity listener error:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return activities
    const tab = TABS.find(t => t.key === activeTab)
    if (!tab?.types) return activities
    return activities.filter(a => tab.types.includes(a.type))
  }, [activities, activeTab])

  if (loading) return null
  if (activities.length === 0) return null

  return (
    <div className="card p-5 border-l-4 border-l-indigo-400">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h3 className="text-sm font-display font-semibold text-gray-900">
          Activite Alex
        </h3>
        <span className="text-xs text-gray-400 ml-auto">
          {activities.length} evenements
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filtered.slice(0, 20).map(activity => {
          const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.error
          const Icon = config.icon

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50/80 transition-colors"
            >
              <div className={`p-1.5 rounded-lg ${config.bg} flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {activity.title}
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {activity.details}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {relativeTime(activity.timestamp || activity.createdAt)}
              </span>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Aucune activite dans cette categorie
          </p>
        )}
      </div>
    </div>
  )
}

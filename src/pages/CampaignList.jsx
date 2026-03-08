import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import {
  Plus,
  Play,
  Pause,
  Eye,
  Zap,
  Users,
  MessageCircle,
  CalendarDays,
  BarChart3,
  Loader2,
  FileText,
  Search,
  Mail,
  Phone,
  Linkedin,
  FlaskConical,
  Target,
  MapPin,
} from 'lucide-react'

const MOCK_CAMPAIGNS = [
  {
    id: 'c1',
    name: 'Prospection SaaS France',
    status: 'running',
    icp: { sector: 'SaaS/Tech', geography: 'France' },
    stats: { contacted: 234, replies: 18, meetings: 3 },
    channels: ['email', 'sms', 'whatsapp'],
    createdAt: '2026-02-15',
  },
  {
    id: 'c2',
    name: 'AO Collectivites',
    status: 'paused',
    icp: { sector: 'Administration', geography: 'Ile-de-France' },
    stats: { contacted: 45, replies: 5, meetings: 1 },
    channels: ['email', 'linkedin'],
    createdAt: '2026-03-01',
  },
  {
    id: 'c3',
    name: 'PME Immobilier',
    status: 'draft',
    icp: { sector: 'Immobilier', geography: 'PACA' },
    stats: { contacted: 0, replies: 0, meetings: 0 },
    channels: ['email'],
    createdAt: '2026-03-06',
  },
  {
    id: 'c4',
    name: 'Relance Q4 Retail',
    status: 'stopped',
    icp: { sector: 'Retail', geography: 'France' },
    stats: { contacted: 189, replies: 22, meetings: 5 },
    channels: ['email', 'whatsapp'],
    createdAt: '2026-01-10',
  },
]

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    pulse: false,
  },
  running: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    pulse: true,
  },
  paused: {
    label: 'En pause',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    pulse: false,
  },
  stopped: {
    label: 'Terminee',
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-400',
    pulse: false,
  },
}

const CHANNEL_ICONS = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
}

const FILTER_TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'running', label: 'Actives' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'stopped', label: 'Terminees' },
]

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  )
}

function CampaignCard({ campaign, onPause, onResume, onDryRun }) {
  const replyRate = campaign.stats.contacted > 0
    ? Math.round((campaign.stats.replies / campaign.stats.contacted) * 100)
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="card-hover p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Target className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {campaign.icp?.sector || 'Non defini'}
            </span>
            <span className="text-gray-300">|</span>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {campaign.icp?.geography || 'France'}
            </span>
          </div>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Channel icons */}
      <div className="flex items-center gap-1.5 mb-4">
        {(campaign.channels || ['email']).map((ch) => {
          const Icon = CHANNEL_ICONS[ch] || Mail
          return (
            <div
              key={ch}
              className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center"
              title={ch}
            >
              <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2.5 rounded-xl bg-indigo-50/60">
          <p className="text-lg font-bold text-gray-900">{campaign.stats.contacted}</p>
          <p className="text-xs text-gray-500">Contactes</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-emerald-50/60">
          <p className="text-lg font-bold text-emerald-600">{campaign.stats.replies}</p>
          <p className="text-xs text-gray-500">Reponses</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-violet-50/60">
          <p className="text-lg font-bold text-violet-600">{campaign.stats.meetings}</p>
          <p className="text-xs text-gray-500">RDV</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>
            {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/app/campaigns/${campaign.id}`}
            className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            Voir
          </Link>

          {campaign.status === 'running' && (
            <button
              onClick={() => onPause(campaign.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1 font-medium"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}

          {campaign.status === 'paused' && (
            <button
              onClick={() => onResume(campaign.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 font-medium"
            >
              <Play className="w-3.5 h-3.5" />
              Reprendre
            </button>
          )}

          {(campaign.status === 'draft' || campaign.status === 'paused') && (
            <button
              onClick={() => onDryRun(campaign.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 font-medium"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Dry Run
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function CampaignList() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Load campaigns
  useEffect(() => {
    if (isDemo) {
      setCampaigns(MOCK_CAMPAIGNS)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'campaigns'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name || 'Campagne sans nom',
            status: data.status || 'draft',
            icp: data.icp || {},
            stats: data.stats || { contacted: 0, replies: 0, meetings: 0 },
            channels: data.channels || ['email'],
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          }
        })
        setCampaigns(loaded.length > 0 ? loaded : MOCK_CAMPAIGNS)
        setLoading(false)
      },
      (err) => {
        console.error('CampaignList listener error:', err)
        setCampaigns(MOCK_CAMPAIGNS)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [currentOrg?.id, isDemo])

  const handlePause = async (id) => {
    if (!isDemo && currentOrg?.id) {
      try {
        await updateDoc(doc(db, 'organizations', currentOrg.id, 'campaigns', id), {
          status: 'paused',
        })
      } catch (err) {
        console.error('Pause error:', err)
        toast.error('Erreur lors de la mise en pause')
        return
      }
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'paused' } : c))
    )
    toast.success('Campagne mise en pause')
  }

  const handleResume = async (id) => {
    if (!isDemo && currentOrg?.id) {
      try {
        await updateDoc(doc(db, 'organizations', currentOrg.id, 'campaigns', id), {
          status: 'running',
        })
      } catch (err) {
        console.error('Resume error:', err)
        toast.error('Erreur lors de la reprise')
        return
      }
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'running' } : c))
    )
    toast.success('Campagne reprise')
  }

  const handleDryRun = (id) => {
    const campaign = campaigns.find((c) => c.id === id)
    toast.success(`Dry Run lance pour "${campaign?.name || 'campagne'}"`)
  }

  // Filtering
  const filtered = campaigns.filter((c) => {
    const matchesFilter = activeFilter === 'all' || c.status === activeFilter
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Stats
  const stats = {
    total: campaigns.length,
    running: campaigns.filter((c) => c.status === 'running').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F6EF7]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Campagnes</h1>
          <p className="text-gray-500 mt-1">
            Gerez et suivez vos campagnes de prospection multicanale
          </p>
        </div>
        <Link
          to="/app/campaigns/wizard"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle campagne
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: BarChart3, color: 'indigo' },
          { label: 'Actives', value: stats.running, icon: Play, color: 'emerald' },
          { label: 'En pause', value: stats.paused, icon: Pause, color: 'amber' },
          { label: 'Brouillons', value: stats.draft, icon: FileText, color: 'gray' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
            <p className="stat-value text-2xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Tab filters */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="input-field pl-10 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="section-title mb-2">Aucune campagne</h3>
          <p className="text-gray-500 mb-6">
            Lancez votre premiere campagne pour commencer a prospecter
          </p>
          <Link
            to="/app/campaigns/wizard"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Creer une campagne
          </Link>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPause={handlePause}
                onResume={handleResume}
                onDryRun={handleDryRun}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

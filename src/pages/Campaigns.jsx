import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Play,
  Pause,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Eye,
  MousePointer,
  Reply,
  CheckCircle,
  Clock,
  Calendar,
  ChevronRight,
  MoreVertical,
  TrendingUp,
  Users,
  Zap,
  Filter,
  Search,
} from 'lucide-react'

// Mock campaigns data
const mockCampaigns = [
  {
    id: '1',
    name: 'Outreach Q1 - SaaS',
    status: 'active',
    createdAt: '2026-01-15',
    channels: ['email', 'sms'],
    stats: {
      prospects: 156,
      sent: 312,
      opened: 187,
      clicked: 89,
      replied: 34,
      bounced: 8,
    },
    nextSend: '2026-02-08 09:00',
    progress: 65,
  },
  {
    id: '2',
    name: 'Relance Janvier',
    status: 'active',
    createdAt: '2026-01-20',
    channels: ['email'],
    stats: {
      prospects: 89,
      sent: 178,
      opened: 112,
      clicked: 45,
      replied: 18,
      bounced: 3,
    },
    nextSend: '2026-02-08 14:00',
    progress: 40,
  },
  {
    id: '3',
    name: 'Cold Outreach Tech',
    status: 'paused',
    createdAt: '2026-01-10',
    channels: ['email', 'whatsapp'],
    stats: {
      prospects: 234,
      sent: 468,
      opened: 280,
      clicked: 134,
      replied: 56,
      bounced: 12,
    },
    nextSend: null,
    progress: 78,
  },
  {
    id: '4',
    name: 'Demo Product Launch',
    status: 'completed',
    createdAt: '2026-01-01',
    channels: ['email', 'sms', 'whatsapp'],
    stats: {
      prospects: 500,
      sent: 1500,
      opened: 975,
      clicked: 450,
      replied: 125,
      bounced: 25,
    },
    nextSend: null,
    progress: 100,
  },
]

// Upcoming sends
const upcomingSends = [
  { time: '09:00', prospect: 'Jean Dupont', channel: 'email', step: 2 },
  { time: '09:15', prospect: 'Marie Martin', channel: 'sms', step: 1 },
  { time: '10:00', prospect: 'Pierre Bernard', channel: 'email', step: 3 },
  { time: '11:30', prospect: 'Sophie Leroy', channel: 'whatsapp', step: 1 },
  { time: '14:00', prospect: 'Thomas Petit', channel: 'email', step: 2 },
]

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
}

const statusConfig = {
  active: { label: 'Active', color: 'emerald', icon: Play, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  paused: { label: 'En pause', color: 'amber', icon: Pause, bg: 'bg-amber-50', text: 'text-amber-700' },
  completed: { label: 'Terminee', color: 'gray', icon: CheckCircle, bg: 'bg-gray-50', text: 'text-gray-700' },
}

function CampaignCard({ campaign, onPause, onResume, onViewDetails }) {
  const status = statusConfig[campaign.status]
  const StatusIcon = status.icon

  const openRate = campaign.stats.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0
  const replyRate = campaign.stats.sent > 0 ? Math.round((campaign.stats.replied / campaign.stats.sent) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cree le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <button
              onClick={() => toast('Menu campagne bientot disponible')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channels */}
        <div className="flex items-center gap-2 mb-4">
          {campaign.channels.map((channel) => {
            const Icon = channelIcons[channel] || Mail
            return (
              <div key={channel} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <p className="text-lg font-bold text-gray-900">{campaign.stats.prospects}</p>
            <p className="text-xs text-gray-500">Prospects</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-violet-50">
            <p className="text-lg font-bold text-violet-600">{openRate}%</p>
            <p className="text-xs text-gray-500">Ouverture</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50">
            <p className="text-lg font-bold text-emerald-600">{replyRate}%</p>
            <p className="text-xs text-gray-500">Reponse</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50">
            <p className="text-lg font-bold text-red-600">{campaign.stats.bounced}</p>
            <p className="text-xs text-gray-500">Bounces</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Progression</span>
            <span className="font-medium text-gray-900">{campaign.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                campaign.status === 'active'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                  : 'bg-gray-300'
              }`}
              style={{ width: `${campaign.progress}%` }}
            />
          </div>
        </div>

        {/* Next send */}
        {campaign.nextSend && (
          <div className="flex items-center gap-2 text-sm text-gray-500 pt-3 border-t border-gray-100">
            <Clock className="w-4 h-4" />
            <span>Prochain envoi: {campaign.nextSend}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {campaign.status === 'active' ? (
            <button
              onClick={() => onPause(campaign.id)}
              className="flex-1 py-2 px-4 bg-amber-100 text-amber-700 font-medium rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : campaign.status === 'paused' ? (
            <button
              onClick={() => onResume(campaign.id)}
              className="flex-1 py-2 px-4 bg-emerald-100 text-emerald-700 font-medium rounded-lg hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Reprendre
            </button>
          ) : null}
          <button
            onClick={() => onViewDetails(campaign.id)}
            className="py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

function UpcomingSendItem({ send }) {
  const Icon = channelIcons[send.channel] || Mail

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-violet-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{send.prospect}</p>
        <p className="text-xs text-gray-500">Etape {send.step}</p>
      </div>
      <span className="text-sm font-medium text-gray-600">{send.time}</span>
    </div>
  )
}

export default function Campaigns() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaigns, setCampaigns] = useState(mockCampaigns)

  const handlePauseCampaign = (id) => {
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'paused', nextSend: null } : c
    ))
    toast.success('Campagne mise en pause')
  }

  const handleResumeCampaign = (id) => {
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'active', nextSend: new Date().toISOString() } : c
    ))
    toast.success('Campagne reprise')
  }

  const handleViewDetails = (id) => {
    toast('Details de la campagne bientot disponibles')
  }

  const handleNewCampaign = () => {
    toast('Creation de campagne bientot disponible - utilisez le Forgeur pour generer des sequences')
  }

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalStats = mockCampaigns.reduce(
    (acc, c) => ({
      prospects: acc.prospects + c.stats.prospects,
      sent: acc.sent + c.stats.sent,
      opened: acc.opened + c.stats.opened,
      replied: acc.replied + c.stats.replied,
    }),
    { prospects: 0, sent: 0, opened: 0, replied: 0 }
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-500 mt-1">Gerez vos sequences d'envoi multicanal</p>
        </div>
        <button
          onClick={handleNewCampaign}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Nouvelle campagne
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-sm text-gray-500">Prospects</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStats.prospects.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Envoyes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStats.sent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Taux ouverture</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.sent > 0 ? Math.round((totalStats.opened / totalStats.sent) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Reply className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">Taux reponse</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.sent > 0 ? Math.round((totalStats.replied / totalStats.sent) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une campagne..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="paused">En pause</option>
              <option value="completed">Terminees</option>
            </select>
          </div>

          {/* Campaign Cards */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune campagne</h3>
                <p className="text-gray-500">Creez votre premiere campagne pour commencer</p>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onPause={handlePauseCampaign}
                  onResume={handleResumeCampaign}
                  onViewDetails={handleViewDetails}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar - Upcoming */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-6">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-500" />
                <h3 className="font-semibold text-gray-900">Envois aujourd'hui</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">8 fevrier 2026</p>
            </div>
            <div className="p-3 divide-y divide-gray-100">
              {upcomingSends.map((send, idx) => (
                <UpcomingSendItem key={idx} send={send} />
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => toast('Calendrier des envois bientot disponible')}
                className="w-full py-2 text-sm text-violet-600 font-medium hover:text-violet-700 flex items-center justify-center gap-1"
              >
                Voir le calendrier complet
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

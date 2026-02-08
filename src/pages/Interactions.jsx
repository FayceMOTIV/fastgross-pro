import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  MessageSquare,
  Search,
  Filter,
  Mail,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  MessageCircle,
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  Check,
  CheckCheck,
  Reply,
  Phone,
  UserPlus,
  RefreshCw,
  Play,
  StopCircle,
  Trophy,
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useInteractions } from '@/hooks/useFirestore'
import { INTERACTION_TYPES } from '@/services/interactions'

// Channel icons
const channelIcons = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageCircle,
  instagram_dm: Instagram,
  voicemail: Mic,
  courrier: MapPin,
}

// Type icons
const typeIcons = {
  email_sent: Send,
  sms_sent: Smartphone,
  whatsapp_sent: MessageCircle,
  instagram_dm_sent: Instagram,
  voicemail_sent: Mic,
  courrier_sent: MapPin,
  email_opened: Eye,
  email_clicked: MousePointer,
  email_bounced: AlertTriangle,
  sms_delivered: Check,
  whatsapp_read: CheckCheck,
  courrier_delivered: Check,
  email_reply: Reply,
  sms_reply: Reply,
  whatsapp_reply: Reply,
  instagram_reply: Reply,
  call_received: Phone,
  prospect_created: UserPlus,
  status_changed: RefreshCw,
  sequence_enrolled: Play,
  sequence_completed: Check,
  sequence_stopped: StopCircle,
  converted: Trophy,
  blacklisted: Ban,
}

export default function Interactions() {
  const { currentOrg } = useOrg()
  const { interactions: firestoreInteractions, loading, error } = useInteractions()

  // Use Firestore interactions
  const interactions = firestoreInteractions
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')

  // Filter interactions
  const filteredInteractions = useMemo(() => {
    return (interactions || []).filter((interaction) => {
      const matchesSearch =
        searchQuery === '' ||
        interaction.prospectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interaction.prospectCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interaction.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interaction.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesChannel = channelFilter === 'all' || interaction.channel === channelFilter
      const matchesDirection =
        directionFilter === 'all' || interaction.direction === directionFilter
      return matchesSearch && matchesChannel && matchesDirection
    })
  }, [interactions, searchQuery, channelFilter, directionFilter])

  // Stats
  const stats = useMemo(() => {
    const safeInteractions = interactions || []
    return {
      total: safeInteractions.length,
      inbound: safeInteractions.filter((i) => i.direction === 'in').length,
      outbound: safeInteractions.filter((i) => i.direction === 'out').length,
      replies: safeInteractions.filter((i) => i.type?.includes('reply')).length,
    }
  }, [interactions])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Interactions</h1>
        <p className="text-dark-400 mt-1">
          Historique de toutes les interactions avec vos prospects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-dark-400">Sortants</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.outbound}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-dark-400">Entrants</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.inbound}</p>
        </div>
        <div className="glass-card p-4 border-brand-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Reply className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Reponses</span>
          </div>
          <p className="text-2xl font-bold text-brand-400">{stats.replies}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Rechercher par prospect, entreprise, contenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Channel filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-dark-500" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="input-field py-2"
            >
              <option value="all">Tous les canaux</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram_dm">Instagram</option>
              <option value="voicemail">Vocal</option>
              <option value="courrier">Courrier</option>
            </select>
          </div>

          {/* Direction filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">Toutes directions</option>
            <option value="out">Sortants</option>
            <option value="in">Entrants</option>
            <option value="track">Tracking</option>
            <option value="system">Systeme</option>
          </select>
        </div>
      </div>

      {/* Interactions Timeline */}
      <div className="glass-card divide-y divide-dark-800">
        {filteredInteractions.map((interaction, index) => {
          const typeInfo = INTERACTION_TYPES[interaction.type] || {}
          const TypeIcon = typeIcons[interaction.type] || MessageSquare
          const ChannelIcon = channelIcons[interaction.channel] || null

          const isInbound = interaction.direction === 'in'
          const isReply = interaction.type?.includes('reply') || false

          return (
            <motion.div
              key={interaction.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`p-4 hover:bg-dark-800/30 transition-colors ${
                isReply ? 'bg-brand-500/5' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isInbound
                      ? 'bg-brand-500/10 border border-brand-500/20'
                      : interaction.direction === 'out'
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : interaction.direction === 'track'
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'bg-dark-800 border border-dark-700'
                  }`}
                >
                  <TypeIcon
                    className={`w-5 h-5 ${
                      isInbound
                        ? 'text-brand-400'
                        : interaction.direction === 'out'
                          ? 'text-blue-400'
                          : interaction.direction === 'track'
                            ? 'text-amber-400'
                            : 'text-dark-400'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{interaction.prospectName}</span>
                    {interaction.prospectCompany && (
                      <span className="text-sm text-dark-400">• {interaction.prospectCompany}</span>
                    )}
                    {interaction.channel && ChannelIcon && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dark-800 text-xs text-dark-400">
                        <ChannelIcon className="w-3 h-3" />
                        {interaction.channel}
                      </span>
                    )}
                  </div>

                  <p className={`text-sm mt-1 ${typeInfo.color || 'text-dark-400'}`}>
                    {typeInfo.label}
                    {interaction.subject && ` - "${interaction.subject}"`}
                  </p>

                  {interaction.content && (
                    <p
                      className={`text-sm mt-2 ${isReply ? 'text-white italic' : 'text-dark-400'} line-clamp-2`}
                    >
                      {isReply && '"'}
                      {interaction.content}
                      {isReply && '"'}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="flex items-center gap-1 text-xs text-dark-500 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(interaction.createdAt, { addSuffix: true, locale: fr })}
                </div>

                {/* Direction indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isInbound
                      ? 'bg-brand-500/10'
                      : interaction.direction === 'out'
                        ? 'bg-blue-500/10'
                        : 'bg-dark-800'
                  }`}
                >
                  {isInbound ? (
                    <ArrowDownLeft className="w-3 h-3 text-brand-400" />
                  ) : interaction.direction === 'out' ? (
                    <ArrowUpRight className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Eye className="w-3 h-3 text-dark-400" />
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredInteractions.length === 0 && (
        <div className="glass-card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucune interaction trouvee</h3>
          <p className="text-dark-400">
            {searchQuery || channelFilter !== 'all' || directionFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Les interactions avec vos prospects apparaitront ici'}
          </p>
        </div>
      )}
    </div>
  )
}

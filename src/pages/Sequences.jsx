import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Workflow,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Edit3,
  Copy,
  Trash2,
  MoreVertical,
  Users,
  Mail,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  MessageCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Zap,
  Loader2,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useSequences } from '@/hooks/useFirestore'
import { SEQUENCE_STATUS, CHANNEL_CONFIG, updateSequence, deleteSequence } from '@/services/sequences'
import toast from 'react-hot-toast'

// Channel icons
const channelIcons = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageCircle,
  instagram_dm: Instagram,
  voicemail: Mic,
  courrier: MapPin,
}

export default function Sequences() {
  const { currentOrg, isChannelAvailable } = useOrg()
  const { canCreateSequences, canEditSequences, canDeleteSequences, canActivateSequences } = usePermissions()
  const { sequences: firestoreSequences, loading, error } = useSequences()

  // Use Firestore sequences
  const sequences = firestoreSequences
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSequence, setSelectedSequence] = useState(null)

  // Filter sequences
  const filteredSequences = useMemo(() => {
    return (sequences || []).filter((seq) => {
      const matchesSearch =
        searchQuery === '' ||
        (seq.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (seq.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || seq.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sequences, searchQuery, statusFilter])

  // Aggregate stats
  const totalStats = useMemo(() => {
    return sequences.reduce(
      (acc, seq) => ({
        enrolled: acc.enrolled + (seq.stats?.enrolled || 0),
        active: acc.active + (seq.stats?.active || 0),
        replied: acc.replied + (seq.stats?.replied || 0),
        converted: acc.converted + (seq.stats?.converted || 0),
      }),
      { enrolled: 0, active: 0, replied: 0, converted: 0 }
    )
  }, [sequences])

  // Handlers
  const handlePause = async (sequence) => {
    if (!currentOrg?.id) return
    try {
      await updateSequence(currentOrg.id, sequence.id, { status: 'paused' })
      toast.success('Sequence mise en pause')
    } catch (err) {
      console.error('Error pausing sequence:', err)
      toast.error('Erreur lors de la pause')
    }
  }

  const handleActivate = async (sequence) => {
    if (!currentOrg?.id) return
    try {
      await updateSequence(currentOrg.id, sequence.id, { status: 'active' })
      toast.success('Sequence activee')
    } catch (err) {
      console.error('Error activating sequence:', err)
      toast.error("Erreur lors de l'activation")
    }
  }

  const handleDelete = async (sequence) => {
    if (!currentOrg?.id || !canDeleteSequences) return
    if (!confirm('Supprimer cette sequence ?')) return
    try {
      await deleteSequence(currentOrg.id, sequence.id)
      toast.success('Sequence supprimee')
    } catch (err) {
      console.error('Error deleting sequence:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Sequences</h1>
          <p className="text-dark-400 mt-1">
            Automatisez votre prospection multicanale
          </p>
        </div>
        {canCreateSequences && (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle sequence
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Sequences actives</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {sequences.filter((s) => s.status === 'active').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-dark-400">Prospects inscrits</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalStats.enrolled}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-dark-400">Reponses</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalStats.replied}</p>
        </div>
        <div className="glass-card p-4 border-brand-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Conversions</span>
          </div>
          <p className="text-2xl font-bold text-brand-400">{totalStats.converted}</p>
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
              placeholder="Rechercher une sequence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-dark-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(SEQUENCE_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sequences Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSequences.map((sequence) => {
          const statusInfo = SEQUENCE_STATUS[sequence.status] || { label: sequence.status, bg: 'bg-dark-800', color: 'text-dark-400' }
          const enrolled = sequence.stats?.enrolled || 0
          const replied = sequence.stats?.replied || 0
          const converted = sequence.stats?.converted || 0
          const replyRate = enrolled > 0
            ? Math.round((replied / enrolled) * 100)
            : 0
          const conversionRate = replied > 0
            ? Math.round((converted / replied) * 100)
            : 0

          return (
            <motion.div
              key={sequence.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 hover:border-brand-500/30 transition-all cursor-pointer group"
              onClick={() => setSelectedSequence(sequence)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate group-hover:text-brand-400 transition-colors">
                      {sequence.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-dark-400 line-clamp-1">{sequence.description}</p>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Steps preview */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                {(sequence.steps || []).map((step, i) => {
                  const ChannelIcon = channelIcons[step.channel] || Mail
                  const channelConfig = CHANNEL_CONFIG[step.channel]

                  return (
                    <div key={i} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-lg ${channelConfig?.bg || 'bg-dark-800'} border ${channelConfig?.border || 'border-dark-700'} flex items-center justify-center flex-shrink-0`}
                        title={`${channelConfig?.label} - J+${step.day}`}
                      >
                        <ChannelIcon className={`w-4 h-4 ${channelConfig?.color || 'text-dark-400'}`} />
                      </div>
                      {i < (sequence.steps?.length || 0) - 1 && (
                        <ArrowRight className="w-3 h-3 text-dark-600 mx-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 rounded-lg bg-dark-800/50">
                  <p className="text-lg font-bold text-white">{sequence.stats?.active || 0}</p>
                  <p className="text-[10px] text-dark-500">En cours</p>
                </div>
                <div className="p-2 rounded-lg bg-dark-800/50">
                  <p className="text-lg font-bold text-amber-400">{replyRate}%</p>
                  <p className="text-[10px] text-dark-500">Reponse</p>
                </div>
                <div className="p-2 rounded-lg bg-dark-800/50">
                  <p className="text-lg font-bold text-brand-400">{conversionRate}%</p>
                  <p className="text-[10px] text-dark-500">Conversion</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-dark-800">
                {sequence.status === 'active' && canActivateSequences && (
                  <button
                    className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1 text-amber-400 hover:bg-amber-500/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePause(sequence)
                    }}
                  >
                    <Pause className="w-3 h-3" />
                    Pause
                  </button>
                )}
                {sequence.status !== 'active' && canActivateSequences && (
                  <button
                    className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1 text-brand-400 hover:bg-brand-500/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleActivate(sequence)
                    }}
                  >
                    <Play className="w-3 h-3" />
                    Activer
                  </button>
                )}
                {canEditSequences && (
                  <button
                    className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit3 className="w-3 h-3" />
                    Editer
                  </button>
                )}
                <button
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Copy className="w-4 h-4" />
                </button>
                {canDeleteSequences && (
                  <button
                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(sequence)
                    }}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredSequences.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Workflow className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucune sequence trouvee</h3>
          <p className="text-dark-400 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Creez votre premiere sequence pour automatiser votre prospection'}
          </p>
          {canCreateSequences && (
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Creer une sequence
            </button>
          )}
        </div>
      )}
    </div>
  )
}

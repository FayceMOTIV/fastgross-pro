import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Check,
  X,
  ChevronDown,
  Eye,
  MessageSquare,
  Send,
  Archive,
  Star,
  Sparkles,
  ExternalLink,
  Calendar,
  User,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  Instagram,
  Mic,
  Plus,
  Upload,
  Download,
  Trash2,
  Tag,
  Play,
  LayoutGrid,
  List,
  GripVertical,
  ArrowRight,
  UserPlus,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import { useProspects } from '@/hooks/useFirestore'
import { usePermissions } from '@/hooks/usePermissions'
import { CHANNEL_CONFIG } from '@/services/sequences'
import {
  createProspect,
  updateProspect,
  updateProspectStatus,
  deleteProspect,
  bulkUpdateProspects,
} from '@/services/prospects'
import toast from 'react-hot-toast'

// Channel icons
const channelIcons = {
  email: Mail,
  sms: Smartphone,
  whatsapp: Smartphone,
  instagram_dm: Instagram,
  voicemail: Mic,
  courrier: MapPin,
}

const ChannelIcon = ({ channel, className = 'w-4 h-4' }) => {
  const Icon = channelIcons[channel] || Mail
  return <Icon className={className} />
}

// Status configuration for Pipeline
const PIPELINE_STAGES = {
  new: {
    label: 'Nouveau',
    color: 'bg-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  enriched: {
    label: 'Enrichi',
    color: 'bg-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
  },
  qualified: {
    label: 'Qualifie',
    color: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  in_sequence: {
    label: 'En sequence',
    color: 'bg-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
  },
  replied: {
    label: 'Repondu',
    color: 'bg-brand-500',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
    text: 'text-brand-400',
  },
  converted: {
    label: 'Converti',
    color: 'bg-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
  },
  opted_out: {
    label: 'Desinscrit',
    color: 'bg-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
  },
}

// Format date helper
const formatDate = (date) => {
  if (!date) return '-'
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Prospect Drawer Component
function ProspectDrawer({ prospect, onClose, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState('info')
  const { currentOrg } = useOrg()
  const { user } = useAuth()

  const handleStatusChange = async (newStatus) => {
    try {
      await updateProspectStatus(currentOrg.id, prospect.id, newStatus, user.uid)
      toast.success('Statut mis a jour')
      onUpdate?.()
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Erreur lors de la mise a jour')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce prospect ?')) return
    try {
      await deleteProspect(currentOrg.id, prospect.id)
      toast.success('Prospect supprime')
      onClose()
    } catch (err) {
      console.error('Error deleting prospect:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

  const statusInfo = PIPELINE_STAGES[prospect.status] || PIPELINE_STAGES.new

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-full max-w-lg bg-dark-900 border-l border-dark-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{prospect.company || 'Sans nom'}</h2>
                <p className="text-sm text-dark-400">
                  {prospect.firstName} {prospect.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status & Score */}
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}
            >
              {statusInfo.label}
            </span>
            {prospect.score && (
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-brand-400">{prospect.score}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {['info', 'timeline', 'actions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-brand-400 border-b-2 border-brand-400'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {tab === 'info' ? 'Informations' : tab === 'timeline' ? 'Timeline' : 'Actions'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-220px)]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-dark-300">Contact</h3>
                {prospect.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-dark-500" />
                    <a
                      href={`mailto:${prospect.email}`}
                      className="text-white hover:text-brand-400"
                    >
                      {prospect.email}
                    </a>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-dark-500" />
                    <a href={`tel:${prospect.phone}`} className="text-white hover:text-brand-400">
                      {prospect.phone}
                    </a>
                  </div>
                )}
                {prospect.linkedinUrl && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-dark-500" />
                    <a
                      href={prospect.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:underline flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Company Info */}
              <div className="space-y-3 pt-4 border-t border-dark-800">
                <h3 className="text-sm font-medium text-dark-300">Entreprise</h3>
                {prospect.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-dark-500" />
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:underline"
                    >
                      {prospect.website}
                    </a>
                  </div>
                )}
                {prospect.enrichment?.industry && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-dark-500" />
                    <span className="text-white">{prospect.enrichment.industry}</span>
                  </div>
                )}
                {prospect.enrichment?.size && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-dark-500" />
                    <span className="text-white">{prospect.enrichment.size}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {prospect.tags?.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-dark-800">
                  <h3 className="text-sm font-medium text-dark-300">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {prospect.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-dark-800 text-xs text-dark-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Channels Available */}
              <div className="space-y-2 pt-4 border-t border-dark-800">
                <h3 className="text-sm font-medium text-dark-300">Canaux disponibles</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(prospect.channels || { email: { available: true } }).map(
                    ([channel, data]) => {
                      if (!data?.available) return null
                      const config = CHANNEL_CONFIG[channel]
                      if (!config) return null
                      return (
                        <div
                          key={channel}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}
                        >
                          <ChannelIcon channel={channel} className={`w-4 h-4 ${config.color}`} />
                          <span className={`text-xs ${config.color}`}>{config.label}</span>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Timeline a venir</p>
                <p className="text-xs text-dark-500 mt-1">Les interactions apparaitront ici</p>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4">
              {/* Status Change */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-dark-300">Changer le statut</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                        prospect.status === key
                          ? `${stage.bg} ${stage.text} border ${stage.border}`
                          : 'bg-dark-800 text-dark-400 hover:text-white'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Sequence */}
              <div className="pt-4 border-t border-dark-800">
                <button className="w-full btn-primary flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Ajouter a une sequence
                </button>
              </div>

              {/* Delete */}
              <div className="pt-4 border-t border-dark-800">
                <button
                  onClick={handleDelete}
                  className="w-full btn-ghost text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer le prospect
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Kanban Column Component
function KanbanColumn({ stage, stageKey, prospects, onProspectClick, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const prospectId = e.dataTransfer.getData('prospectId')
    if (prospectId) {
      onDrop(prospectId, stageKey)
    }
  }

  return (
    <div
      className={`flex-shrink-0 w-72 bg-dark-800/30 rounded-xl border ${
        isDragOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-dark-700'
      } transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <span className="font-medium text-white text-sm">{stage.label}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-dark-700 text-xs text-dark-300">
            {prospects.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
        {prospects.map((prospect) => (
          <motion.div
            key={prospect.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('prospectId', prospect.id)
            }}
            onClick={() => onProspectClick(prospect)}
            className="p-3 bg-dark-800 rounded-lg border border-dark-700 cursor-pointer hover:border-brand-500/30 transition-colors group"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-white text-sm truncate flex-1">
                {prospect.company || 'Sans nom'}
              </p>
              <GripVertical className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-dark-400 truncate">{prospect.email}</p>
            {prospect.score && (
              <div className="flex items-center gap-1 mt-2">
                <Sparkles className="w-3 h-3 text-brand-400" />
                <span className="text-xs text-brand-400">{prospect.score}%</span>
              </div>
            )}
          </motion.div>
        ))}

        {prospects.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-dark-500">Aucun prospect</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Add Prospect Modal
function AddProspectModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    website: '',
  })
  const [loading, setLoading] = useState(false)
  const { currentOrg } = useOrg()
  const { user } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.company) {
      toast.error('Email et entreprise requis')
      return
    }

    setLoading(true)
    try {
      await createProspect(
        currentOrg.id,
        {
          ...formData,
          status: 'new',
          source: 'manual',
          channels: { email: { available: true } },
        },
        user
      )
      toast.success('Prospect ajoute')
      onClose()
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', website: '' })
    } catch (err) {
      console.error('Error creating prospect:', err)
      toast.error('Erreur lors de la creation')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-dark-800">
          <h2 className="text-lg font-bold text-white">Ajouter un prospect</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Prenom</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Nom</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Telephone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Entreprise *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Site web</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="input-field w-full"
              placeholder="https://"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? 'Creation...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function Prospects() {
  const { currentOrg } = useOrg()
  const { user } = useAuth()
  const { canCreateProspects, canEditProspects, canDeleteProspects } = usePermissions()
  const { prospects, loading, error } = useProspects()

  const [view, setView] = useState('list') // 'list' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return (prospects || []).filter((prospect) => {
      const matchesSearch =
        searchQuery === '' ||
        prospect.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.lastName?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [prospects, searchQuery, statusFilter])

  // Group by status for Kanban
  const prospectsByStatus = useMemo(() => {
    const grouped = {}
    Object.keys(PIPELINE_STAGES).forEach((status) => {
      grouped[status] = filteredProspects.filter((p) => p.status === status)
    })
    return grouped
  }, [filteredProspects])

  // Handle Kanban drop
  const handleKanbanDrop = async (prospectId, newStatus) => {
    if (!currentOrg?.id) return
    try {
      await updateProspectStatus(currentOrg.id, prospectId, newStatus, user?.uid)
      toast.success('Statut mis a jour')
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Erreur lors de la mise a jour')
    }
  }

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  // Select all
  const selectAll = () => {
    if (selectedIds.length === filteredProspects.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProspects.map((p) => p.id))
    }
  }

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.length} prospects ?`)) return
    try {
      for (const id of selectedIds) {
        await deleteProspect(currentOrg.id, id)
      }
      toast.success(`${selectedIds.length} prospects supprimes`)
      setSelectedIds([])
    } catch (err) {
      console.error('Error bulk deleting:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Prospects</h1>
          <p className="text-dark-400 mt-1">{prospects.length} prospects dans votre pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateProspects && (
            <>
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importer CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
              <option key={key} value={key}>
                {stage.label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-dark-800 rounded-lg">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${
                view === 'list' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-md transition-colors ${
                view === 'kanban' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700">
            <span className="text-sm text-dark-400">{selectedIds.length} selectionne(s)</span>
            <button className="btn-ghost text-xs flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Tagger
            </button>
            <button className="btn-ghost text-xs flex items-center gap-1">
              <Play className="w-3 h-3" />
              Ajouter a sequence
            </button>
            {canDeleteProspects && (
              <button
                onClick={handleBulkDelete}
                className="btn-ghost text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? (
        // Table View
        <div className="glass-card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 border-b border-dark-700 text-xs font-medium text-dark-400 uppercase tracking-wider">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={
                  selectedIds.length === filteredProspects.length && filteredProspects.length > 0
                }
                onChange={selectAll}
                className="rounded border-dark-600 bg-dark-800 text-brand-500"
              />
            </div>
            <div className="col-span-3">Entreprise</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Dernier contact</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-dark-800">
            {filteredProspects.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun prospect</h3>
                <p className="text-dark-400 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Ajoutez vos premiers prospects'}
                </p>
                {canCreateProspects && (
                  <button onClick={() => setShowAddModal(true)} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un prospect
                  </button>
                )}
              </div>
            ) : (
              filteredProspects.map((prospect) => {
                const statusInfo = PIPELINE_STAGES[prospect.status] || PIPELINE_STAGES.new
                return (
                  <motion.div
                    key={prospect.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-dark-800/50 transition-colors"
                  >
                    <div className="md:grid md:grid-cols-12 gap-4 items-center">
                      {/* Checkbox */}
                      <div className="col-span-1 hidden md:flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prospect.id)}
                          onChange={() => toggleSelection(prospect.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-dark-600 bg-dark-800 text-brand-500"
                        />
                      </div>

                      {/* Company */}
                      <div
                        className="col-span-3 flex items-center gap-3 mb-3 md:mb-0 cursor-pointer"
                        onClick={() => setSelectedProspect(prospect)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-dark-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {prospect.company || 'Sans nom'}
                          </p>
                          <p className="text-xs text-dark-400 truncate">{prospect.email}</p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        <p className="text-sm text-white truncate">
                          {prospect.firstName} {prospect.lastName}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        {prospect.score ? (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-brand-400" />
                            <span className="text-sm text-brand-400">{prospect.score}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-dark-500">-</span>
                        )}
                      </div>

                      {/* Last Contact */}
                      <div className="col-span-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-dark-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(prospect.updatedAt)}</span>
                        </div>
                        <button
                          onClick={() => setSelectedProspect(prospect)}
                          className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        // Kanban View
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(PIPELINE_STAGES).map(([stageKey, stage]) => (
            <KanbanColumn
              key={stageKey}
              stage={stage}
              stageKey={stageKey}
              prospects={prospectsByStatus[stageKey] || []}
              onProspectClick={setSelectedProspect}
              onDrop={handleKanbanDrop}
            />
          ))}
        </div>
      )}

      {/* Prospect Drawer */}
      <AnimatePresence>
        {selectedProspect && (
          <ProspectDrawer
            prospect={selectedProspect}
            onClose={() => setSelectedProspect(null)}
            onUpdate={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Add Prospect Modal */}
      <AnimatePresence>
        <AddProspectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </AnimatePresence>
    </div>
  )
}

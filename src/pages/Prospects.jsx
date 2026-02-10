import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  X,
  Sparkles,
  ExternalLink,
  User,
  MoreHorizontal,
  Loader2,
  Smartphone,
  Instagram,
  Mic,
  Plus,
  Upload,
  Trash2,
  Tag,
  Play,
  LayoutGrid,
  List,
  GripVertical,
  Target,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Check,
  Send,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import { useProspects } from '@/hooks/useFirestore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  createProspect,
  updateProspectStatus,
  deleteProspect,
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

// Channel styles
const CHANNEL_STYLES = {
  email: { bg: 'bg-blue-100', color: 'text-blue-600', border: 'border-blue-200', label: 'Email' },
  sms: { bg: 'bg-emerald-100', color: 'text-emerald-600', border: 'border-emerald-200', label: 'SMS' },
  whatsapp: { bg: 'bg-green-100', color: 'text-green-600', border: 'border-green-200', label: 'WhatsApp' },
  instagram_dm: { bg: 'bg-pink-100', color: 'text-pink-600', border: 'border-pink-200', label: 'Instagram' },
  voicemail: { bg: 'bg-purple-100', color: 'text-purple-600', border: 'border-purple-200', label: 'Vocal' },
  courrier: { bg: 'bg-amber-100', color: 'text-amber-600', border: 'border-amber-200', label: 'Courrier' },
}

// Pipeline status configuration
const PIPELINE_STAGES = {
  new: { label: 'Nouveau', color: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  ready: { label: 'Pret', color: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  in_sequence: { label: 'En sequence', color: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  replied: { label: 'Repondu', color: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  converted: { label: 'Converti', color: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  lost: { label: 'Perdu', color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
}

// Score category colors
const SCORE_STYLES = {
  hot: { bg: 'bg-green-100', text: 'text-green-700', label: 'Chaud' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Tiede' },
  cold: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Froid' },
  ice: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Glace' },
}

// Format date helper
const formatDate = (date) => {
  if (!date) return '-'
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const formatTimeAgo = (date) => {
  if (!date) return ''
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date)
  const seconds = Math.floor((new Date() - d) / 1000)
  if (seconds < 60) return "A l'instant"
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  return `Il y a ${Math.floor(seconds / 86400)}j`
}

// ============================================================================
// PROSPECT DETAIL DRAWER
// ============================================================================

function ProspectDrawer({ prospect, onClose, onUpdate }) {
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
  const scoreStyle = SCORE_STYLES[prospect.scoreCategory] || SCORE_STYLES.cold

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-accent/5 to-purple-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-text">{prospect.company || 'Sans nom'}</h2>
                <p className="text-text-secondary">
                  {prospect.firstName} {prospect.lastName} - {prospect.jobTitle || 'Contact'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {prospect.industry || prospect.sector} {prospect.city ? `- ${prospect.city}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/50 text-text-muted hover:text-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status & Score */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}>
              {statusInfo.label}
            </span>
            {prospect.score !== undefined && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${scoreStyle.bg}`}>
                <Target className={`w-3.5 h-3.5 ${scoreStyle.text}`} />
                <span className={`text-xs font-medium ${scoreStyle.text}`}>{prospect.score} pts</span>
              </div>
            )}
            {prospect.scrapingLayer && (
              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                Scraping L{prospect.scrapingLayer}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['info', 'timeline', 'sequence', 'actions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'info' ? 'Infos' : tab === 'timeline' ? 'Timeline' : tab === 'sequence' ? 'Sequence' : 'Actions'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-260px)]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Score Breakdown */}
              {prospect.scoreBreakdown && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-purple-50 border border-accent/10">
                  <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    Scoring (100 pts)
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(prospect.scoreBreakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary capitalize">
                          {key === 'sectorRelevance' ? 'Pertinence secteur' :
                           key === 'sizeMatch' ? 'Taille correspondante' :
                           key === 'dataAccessibility' ? 'Accessibilite donnees' :
                           key === 'locationMatch' ? 'Localisation' :
                           key === 'dataQuality' ? 'Qualite donnees' :
                           key === 'sourceQuality' ? 'Qualite source' : key}
                        </span>
                        <span className="font-medium text-text">{value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">Contact</h3>
                {prospect.email && (
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-text">{prospect.email}</span>
                  </a>
                )}
                {prospect.phone && (
                  <a href={`tel:${prospect.phone}`} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span className="text-text">{prospect.phone}</span>
                  </a>
                )}
                {prospect.website && (
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <span className="text-text truncate flex-1">{prospect.website}</span>
                    <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                )}
                {prospect.linkedinUrl && (
                  <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-text">LinkedIn</span>
                    <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                )}
              </div>

              {/* Positioning */}
              {prospect.positioning && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text">Positionnement</h3>
                  <p className="text-sm text-text-secondary p-3 rounded-lg bg-gray-50">{prospect.positioning}</p>
                </div>
              )}

              {/* Why needs service */}
              {prospect.whyNeedsService && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Pourquoi ce prospect
                  </h3>
                  <p className="text-sm text-text-secondary p-3 rounded-lg bg-amber-50 border border-amber-100">{prospect.whyNeedsService}</p>
                </div>
              )}

              {/* Pain Points */}
              {prospect.painPoints?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    <Target className="w-4 h-4 text-red-500" />
                    Pain Points
                  </h3>
                  <ul className="space-y-2">
                    {prospect.painPoints.map((pain, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        {pain}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Icebreakers */}
              {prospect.icebreakers?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Accroches suggerees
                  </h3>
                  <div className="space-y-2">
                    {prospect.icebreakers.map((ice, i) => (
                      <p key={i} className="text-sm text-text-secondary p-3 rounded-lg bg-amber-50 border border-amber-100 italic">
                        "{ice}"
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {prospect.tags?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {prospect.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Timeline entries */}
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-text">Prospect cree</p>
                    <p className="text-xs text-text-muted mt-1">{formatDate(prospect.createdAt)}</p>
                    <p className="text-xs text-text-secondary mt-2">Source: {prospect.source || 'engine'}</p>
                  </div>
                </div>

                {prospect.sequenceGeneratedAt && (
                  <div className="relative">
                    <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-purple-500 border-2 border-white" />
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-text">Sequence generee</p>
                      <p className="text-xs text-text-muted mt-1">{formatDate(prospect.sequenceGeneratedAt)}</p>
                      <p className="text-xs text-text-secondary mt-2">{prospect.sequenceSteps?.length || 0} etapes</p>
                    </div>
                  </div>
                )}

                {prospect.lastContactedAt && (
                  <div className="relative">
                    <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-text">Dernier contact</p>
                      <p className="text-xs text-text-muted mt-1">{formatDate(prospect.lastContactedAt)}</p>
                    </div>
                  </div>
                )}

                {/* More timeline entries would come from interactions collection */}
              </div>

              {!prospect.sequenceGeneratedAt && !prospect.lastContactedAt && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">Aucune activite</p>
                  <p className="text-xs text-text-muted mt-1">Les interactions apparaitront ici</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sequence' && (
            <div className="space-y-4">
              {prospect.sequenceSteps?.length > 0 ? (
                <div className="space-y-4">
                  {prospect.sequenceSteps.map((step, i) => {
                    const channelStyle = CHANNEL_STYLES[step.channel] || CHANNEL_STYLES.email
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${channelStyle.border} ${channelStyle.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ChannelIcon channel={step.channel} className={`w-4 h-4 ${channelStyle.color}`} />
                            <span className={`text-sm font-medium ${channelStyle.color}`}>
                              Jour {step.day} - {channelStyle.label}
                            </span>
                          </div>
                          {step.goal && (
                            <span className="text-xs text-text-muted">{step.goal}</span>
                          )}
                        </div>
                        {step.subject && (
                          <p className="text-sm font-medium text-text mb-2">Objet: {step.subject}</p>
                        )}
                        <p className="text-sm text-text-secondary whitespace-pre-wrap line-clamp-4">
                          {step.content}
                        </p>
                        {step.cta && (
                          <p className="text-xs text-accent mt-2 font-medium">CTA: {step.cta}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">Aucune sequence</p>
                  <p className="text-xs text-text-muted mt-1">Ce prospect n'a pas encore de sequence</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Status Change */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">Changer le statut</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        prospect.status === key
                          ? `${stage.bg} ${stage.text} border-2 ${stage.border}`
                          : 'bg-gray-50 text-text-secondary hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Sequence */}
              <div className="pt-4 border-t border-gray-100">
                <button className="w-full btn-primary flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Lancer la sequence
                </button>
              </div>

              {/* Delete */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 font-medium flex items-center justify-center gap-2 transition-colors"
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

// ============================================================================
// ADD PROSPECT MODAL
// ============================================================================

function AddProspectModal({ isOpen, onClose }) {
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
          score: 50,
          scoreCategory: 'warm',
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-text">Ajouter un prospect</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Prenom</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nom</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Telephone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Entreprise *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Site web</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="input-field w-full"
              placeholder="https://"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Creation...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Prospects() {
  const { currentOrg } = useOrg()
  const { user } = useAuth()
  const { canCreateProspects, canDeleteProspects } = usePermissions()
  const { prospects, loading } = useProspects()

  const [view, setView] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
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
        prospect.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.industry?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter
      const matchesScore = scoreFilter === 'all' || prospect.scoreCategory === scoreFilter

      return matchesSearch && matchesStatus && matchesScore
    })
  }, [prospects, searchQuery, statusFilter, scoreFilter])

  // Group by status for Kanban
  const prospectsByStatus = useMemo(() => {
    const grouped = {}
    Object.keys(PIPELINE_STAGES).forEach((status) => {
      grouped[status] = filteredProspects.filter((p) => p.status === status)
    })
    return grouped
  }, [filteredProspects])

  // Stats
  const stats = useMemo(() => {
    const all = prospects || []
    return {
      total: all.length,
      hot: all.filter(p => p.scoreCategory === 'hot').length,
      warm: all.filter(p => p.scoreCategory === 'warm').length,
      cold: all.filter(p => p.scoreCategory === 'cold').length,
      withSequence: all.filter(p => p.sequenceSteps?.length > 0).length,
    }
  }, [prospects])

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

  // Bulk delete
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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Chargement des prospects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Prospects</h1>
          <p className="text-text-muted mt-1">{stats.total} prospects - {stats.hot} chauds, {stats.warm} tiedes</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateProspects && (
            <>
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importer CSV
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-text-muted">Total</span>
          </div>
          <p className="text-xl font-bold text-text">{stats.total}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-xs text-text-muted">Chauds</span>
          </div>
          <p className="text-xl font-bold text-green-600">{stats.hot}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-text-muted">Tiedes</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{stats.warm}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-text-muted">Froids</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{stats.cold}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-text-muted">Avec sequence</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{stats.withSequence}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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
              <option key={key} value={key}>{stage.label}</option>
            ))}
          </select>

          {/* Score Filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Tous les scores</option>
            <option value="hot">Chauds (80+)</option>
            <option value="warm">Tiedes (60-79)</option>
            <option value="cold">Froids (40-59)</option>
            <option value="ice">Glace (-40)</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${
                view === 'list' ? 'bg-white text-accent shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-md transition-colors ${
                view === 'kanban' ? 'bg-white text-accent shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-text-muted">{selectedIds.length} selectionne(s)</span>
            <button className="text-sm text-text-secondary hover:text-text flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Tagger
            </button>
            <button className="text-sm text-text-secondary hover:text-text flex items-center gap-1">
              <Play className="w-3 h-3" />
              Lancer sequence
            </button>
            {canDeleteProspects && (
              <button onClick={handleBulkDelete} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className="card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 border-b border-gray-100 text-xs font-medium text-text-muted uppercase tracking-wider bg-gray-50">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredProspects.length && filteredProspects.length > 0}
                onChange={selectAll}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-3">Entreprise</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Ajoute</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-50">
            {filteredProspects.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <h3 className="text-lg font-medium text-text mb-2">Aucun prospect</h3>
                <p className="text-text-muted mb-6">
                  {searchQuery || statusFilter !== 'all' || scoreFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Lancez le moteur pour trouver des prospects'}
                </p>
              </div>
            ) : (
              filteredProspects.map((prospect) => {
                const statusInfo = PIPELINE_STAGES[prospect.status] || PIPELINE_STAGES.new
                const scoreStyle = SCORE_STYLES[prospect.scoreCategory] || SCORE_STYLES.cold
                return (
                  <motion.div
                    key={prospect.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    <div className="md:grid md:grid-cols-12 gap-4 items-center">
                      {/* Checkbox */}
                      <div className="col-span-1 hidden md:flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prospect.id)}
                          onChange={() => toggleSelection(prospect.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </div>

                      {/* Company */}
                      <div className="col-span-3 flex items-center gap-3 mb-3 md:mb-0">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text truncate">{prospect.company || 'Sans nom'}</p>
                          <p className="text-xs text-text-muted truncate">{prospect.industry || prospect.sector}</p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        <p className="text-sm text-text truncate">{prospect.firstName} {prospect.lastName}</p>
                        <p className="text-xs text-text-muted truncate">{prospect.email}</p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        {prospect.score !== undefined ? (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${scoreStyle.bg}`}>
                            <Target className={`w-3 h-3 ${scoreStyle.text}`} />
                            <span className={`text-xs font-medium ${scoreStyle.text}`}>{prospect.score}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-muted">-</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs text-text-muted">{formatTimeAgo(prospect.createdAt)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProspect(prospect)
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-text"
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
            <div
              key={stageKey}
              className="flex-shrink-0 w-72 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="font-medium text-text text-sm">{stage.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white text-xs text-text-muted border border-gray-200">
                    {prospectsByStatus[stageKey]?.length || 0}
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {(prospectsByStatus[stageKey] || []).map((prospect) => (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspect(prospect)}
                    className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-accent/30 hover:shadow-soft-sm transition-all"
                  >
                    <p className="font-medium text-text text-sm truncate">{prospect.company || 'Sans nom'}</p>
                    <p className="text-xs text-text-muted truncate mt-1">{prospect.email}</p>
                    {prospect.score !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        <Target className="w-3 h-3 text-accent" />
                        <span className="text-xs text-accent font-medium">{prospect.score} pts</span>
                      </div>
                    )}
                  </div>
                ))}
                {(prospectsByStatus[stageKey] || []).length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-text-muted">Aucun prospect</p>
                  </div>
                )}
              </div>
            </div>
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

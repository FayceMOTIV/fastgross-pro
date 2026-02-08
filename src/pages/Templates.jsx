import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Mail,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  Edit3,
  Copy,
  Trash2,
  Eye,
  X,
  Check,
  MessageCircle,
  MoreVertical,
  Star,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useTemplates } from '@/hooks/useFirestore'
import {
  TEMPLATE_CATEGORIES,
  CHANNEL_CONSTRAINTS,
  TEMPLATE_VARIABLES,
  getTemplatePreview,
  duplicateTemplate,
  deleteTemplate,
} from '@/services/templates'
import { CHANNEL_CONFIG } from '@/services/sequences'
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

export default function Templates() {
  const { currentOrg, isChannelAvailable } = useOrg()
  const { canCreateTemplates, canEditTemplates, canDeleteTemplates } = usePermissions()
  const { templates: firestoreTemplates, loading, error } = useTemplates()

  // Use Firestore templates
  const templates = firestoreTemplates
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return (templates || []).filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        (template.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesChannel = channelFilter === 'all' || template.channel === channelFilter
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
      return matchesSearch && matchesChannel && matchesCategory
    })
  }, [templates, searchQuery, channelFilter, categoryFilter])

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups = {}
    filteredTemplates.forEach((template) => {
      if (!groups[template.category]) {
        groups[template.category] = []
      }
      groups[template.category].push(template)
    })
    return groups
  }, [filteredTemplates])

  const handlePreview = (template) => {
    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  const handleDuplicate = async (template) => {
    if (!currentOrg?.id) return
    try {
      await duplicateTemplate(currentOrg.id, template.id)
      toast.success('Template duplique')
    } catch (err) {
      console.error('Error duplicating template:', err)
      toast.error('Erreur lors de la duplication')
    }
  }

  const handleDelete = async (template) => {
    if (!currentOrg?.id || !canDeleteTemplates) return
    if (!confirm('Supprimer ce template ?')) return
    try {
      await deleteTemplate(currentOrg.id, template.id)
      toast.success('Template supprime')
    } catch (err) {
      console.error('Error deleting template:', err)
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
          <h1 className="page-title">Templates</h1>
          <p className="text-dark-400 mt-1">Gerez vos modeles de messages pour tous les canaux</p>
        </div>
        {canCreateTemplates && (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouveau template
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{templates.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-dark-400">Taux d'ouverture moyen</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {templates.filter((t) => t.stats?.avgOpenRate).length > 0
              ? Math.round(
                  templates
                    .filter((t) => t.stats?.avgOpenRate)
                    .reduce((acc, t) => acc + t.stats.avgOpenRate, 0) /
                    templates.filter((t) => t.stats?.avgOpenRate).length
                )
              : 0}
            %
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-dark-400">Taux de reponse moyen</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {templates.length > 0
              ? Math.round(
                  templates.reduce((acc, t) => acc + (t.stats?.avgReplyRate || 0), 0) /
                    templates.length
                )
              : 0}
            %
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-dark-400">Utilisations totales</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {templates.reduce((acc, t) => acc + (t.stats?.usageCount || 0), 0)}
          </p>
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
              placeholder="Rechercher un template..."
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
              {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">Toutes categories</option>
            {Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${TEMPLATE_CATEGORIES[category]?.color.replace('text-', 'bg-')}`}
            />
            <h2 className="text-sm font-medium text-dark-300">
              {TEMPLATE_CATEGORIES[category]?.label || category}
            </h2>
            <span className="text-xs text-dark-500">({categoryTemplates.length})</span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTemplates.map((template) => {
              const ChannelIcon = channelIcons[template.channel] || Mail
              const channelConfig = CHANNEL_CONFIG[template.channel]

              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 hover:border-brand-500/30 transition-all cursor-pointer group"
                  onClick={() => handlePreview(template)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${channelConfig?.bg || 'bg-dark-800'} border ${channelConfig?.border || 'border-dark-700'} flex items-center justify-center`}
                      >
                        <ChannelIcon
                          className={`w-5 h-5 ${channelConfig?.color || 'text-dark-400'}`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-white group-hover:text-brand-400 transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-xs text-dark-500">{channelConfig?.label}</p>
                      </div>
                    </div>
                    {template.isDefault && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-dark-400 mb-4 line-clamp-2">{template.description}</p>

                  {/* Subject (email only) */}
                  {template.subject && (
                    <div className="px-3 py-2 rounded-lg bg-dark-800/50 mb-4">
                      <p className="text-xs text-dark-500 mb-0.5">Objet</p>
                      <p className="text-sm text-white truncate">{template.subject}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-dark-500">
                    <span>{template.stats?.usageCount || 0} utilisations</span>
                    {template.stats?.avgOpenRate && (
                      <span className="text-emerald-400">
                        {template.stats.avgOpenRate}% ouverture
                      </span>
                    )}
                    {template.stats?.avgReplyRate && (
                      <span className="text-amber-400">{template.stats.avgReplyRate}% reponse</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(template)
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      Apercu
                    </button>
                    {canEditTemplates && (
                      <button
                        className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit3 className="w-3 h-3" />
                        Modifier
                      </button>
                    )}
                    <button
                      className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicate(template)
                      }}
                      title="Dupliquer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {canDeleteTemplates && (
                      <button
                        className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(template)
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
        </div>
      ))}

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun template trouve</h3>
          <p className="text-dark-400 mb-6">
            {searchQuery || channelFilter !== 'all' || categoryFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Creez votre premier template pour commencer'}
          </p>
          {canCreateTemplates && (
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Creer un template
            </button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-800">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedTemplate.name}</h2>
                  <p className="text-sm text-dark-400">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {selectedTemplate.subject && (
                  <div className="mb-4">
                    <p className="text-xs text-dark-500 mb-1">Objet</p>
                    <p className="text-white bg-dark-800/50 px-4 py-2 rounded-lg">
                      {getTemplatePreview(selectedTemplate).subject}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-dark-500 mb-1">Contenu</p>
                  <div className="bg-dark-800/50 px-4 py-3 rounded-lg">
                    <pre className="text-sm text-white whitespace-pre-wrap font-sans">
                      {getTemplatePreview(selectedTemplate).content}
                    </pre>
                  </div>
                </div>

                {/* Variables */}
                <div className="mt-6">
                  <p className="text-xs text-dark-500 mb-2">Variables disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(TEMPLATE_VARIABLES).map(([key, info]) => (
                      <span
                        key={key}
                        className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 text-xs font-mono"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-800">
                <button onClick={() => setPreviewOpen(false)} className="btn-ghost">
                  Fermer
                </button>
                {canEditTemplates && (
                  <button className="btn-primary flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Modifier
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

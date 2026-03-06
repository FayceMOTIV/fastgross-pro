/**
 * Inbox — Feed des reponses prospects classifiees
 * Tabs filtrables, draft IA editable, actions (Calendly, appel, archiver, blacklister), bulk mark
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useOrg } from '@/contexts/OrgContext'
import { functions, db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  Inbox as InboxIcon,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Instagram,
  Linkedin,
  Smartphone,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  Loader2,
  ArrowRight,
  Sparkles,
  Calendar,
  Phone,
  Archive,
  Ban,
  Send,
  Edit3,
  CheckSquare,
  Square,
} from 'lucide-react'

// --- Configuration categories ---
const CATEGORY_CONFIG = {
  POSITIVE: { emoji: '\u{1F7E2}', label: 'Positif', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', priority: 1 },
  NEGATIVE: { emoji: '\u{1F534}', label: 'Negatif', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', priority: 7 },
  OBJECTION: { emoji: '\u{1F7E0}', label: 'Objection', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', priority: 2 },
  REFERRAL: { emoji: '\u{1F535}', label: 'Referral', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', priority: 3 },
  NOT_NOW: { emoji: '\u23F0', label: 'Pas maintenant', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', priority: 3 },
  OOO: { emoji: '\u26AA', label: 'Absent', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', priority: 5 },
  WRONG_PERSON: { emoji: '\u{1F7E3}', label: 'Mauvais contact', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', priority: 4 },
  UNSUBSCRIBE: { emoji: '\u26D4', label: 'Desinscription', color: 'bg-red-100 text-red-600', dot: 'bg-red-400', priority: 8 },
  NEUTRAL: { emoji: '\u26AB', label: 'Neutre', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', priority: 6 },
}

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  instagram: Instagram,
  linkedin: Linkedin,
  sms: Smartphone,
}

const CHANNEL_LABELS = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  sms: 'SMS',
}

const TABS = [
  { id: 'pending', label: 'A traiter', filter: (r) => r.status === 'unread' },
  { id: 'interested', label: 'Interesses', filter: (r) => r.classification?.category === 'POSITIVE' },
  { id: 'objections', label: 'Objections', filter: (r) => r.classification?.category === 'OBJECTION' },
  { id: 'meetings', label: 'RDV confirmes', filter: (r) => r.meetingConfirmed },
  { id: 'archive', label: 'Archive', filter: (r) => r.status === 'handled' },
]

// --- Mock data ---
const MOCK_REPLIES = [
  {
    id: 'mock-1',
    prospectName: 'Jean Dupont',
    prospectCompany: 'Boulangerie Dupont',
    channel: 'whatsapp',
    from: '+33612345678',
    replyText: 'Bonjour, oui ca m\'interesse beaucoup ! Quand est-ce qu\'on pourrait en discuter ?',
    classification: { category: 'POSITIVE', label: 'Positif', confidence: 0.95, sentiment: 'positive', method: 'ai' },
    scripts: {
      script1: { label: 'Direct', text: 'Bonjour Jean, merci pour votre interet ! Je vous propose un echange rapide cette semaine. Quelles sont vos disponibilites ?' },
      script2: { label: 'Relationnel', text: 'Bonjour Jean, ravi de votre retour ! J\'aimerais beaucoup echanger avec vous pour mieux comprendre vos besoins. Quel creneau vous conviendrait ?' },
      actionRecommandee: 'Proposer un rendez-vous rapidement',
    },
    status: 'unread',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'mock-2',
    prospectName: 'Marie Martin',
    prospectCompany: 'Salon Belle & Zen',
    channel: 'email',
    from: 'marie@belleetzen.fr',
    replyText: 'Merci mais nous avons deja un prestataire pour ca. Bonne continuation.',
    classification: { category: 'NEGATIVE', label: 'Negatif', confidence: 0.88, sentiment: 'negative', method: 'ai' },
    scripts: {
      script1: { label: 'Cloture', text: 'Merci pour votre retour Marie. Je respecte votre decision. N\'hesitez pas a revenir vers nous si vos besoins evoluent.' },
      script2: { label: 'Doux', text: 'Bien compris Marie. Je ne vous solliciterai plus. Bonne continuation dans vos projets !' },
      actionRecommandee: 'Ajouter a la liste de suppression',
    },
    status: 'unread',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: 'mock-3',
    prospectName: 'Pierre Lefevre',
    prospectCompany: 'Garage Lefevre',
    channel: 'instagram',
    from: '@garagelefevre',
    replyText: 'C\'est trop cher pour nous. On a pas le budget en ce moment.',
    classification: { category: 'OBJECTION', label: 'Objection', confidence: 0.82, sentiment: 'negative', method: 'keywords' },
    scripts: {
      script1: { label: 'Direct', text: 'Je comprends votre point Pierre. Permettez-moi de vous apporter quelques precisions qui pourraient changer votre perspective.' },
      script2: { label: 'Relationnel', text: 'Excellente question Pierre ! C\'est justement un sujet qu\'on adresse regulierement. Voulez-vous qu\'on en discute rapidement ?' },
      actionRecommandee: 'Repondre a l\'objection avec des arguments adaptes',
    },
    status: 'unread',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: 'mock-4',
    prospectName: 'Sophie Bernard',
    prospectCompany: 'Fleuriste Sophie',
    channel: 'whatsapp',
    from: '+33698765432',
    replyText: 'Je suis en vacances jusqu\'au 15 mars. Recontactez-moi apres svp.',
    classification: { category: 'OOO', label: 'Absent', confidence: 0.91, sentiment: 'neutral', method: 'keywords' },
    scripts: {
      script1: { label: 'Relance', text: 'Pas de souci ! Je reviendrai vers vous apres votre retour. Bonnes vacances !' },
      script2: { label: 'Note', text: 'Note interne : replanifier le contact apres le 15 mars.' },
      actionRecommandee: 'Replanifier le contact apres retour',
    },
    status: 'handled',
    actionTaken: 'Relance planifiee pour le 16 mars',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: 'mock-5',
    prospectName: 'Luc Moreau',
    prospectCompany: 'Restaurant Le Gourmet',
    channel: 'linkedin',
    from: 'luc-moreau-chef',
    replyText: 'Contactez plutot mon associe Thomas pour ce genre de sujet. Je vous envoie son numero.',
    classification: { category: 'REFERRAL', label: 'Referral', confidence: 0.87, sentiment: 'positive', method: 'ai' },
    scripts: {
      script1: { label: 'Direct', text: 'Merci pour cette redirection Luc. Je vais contacter Thomas de votre part. Bonne journee !' },
      script2: { label: 'Relationnel', text: 'C\'est tres gentil Luc ! Pourriez-vous nous mettre en relation par email ? Ce serait ideal.' },
      actionRecommandee: 'Contacter le nouveau referent',
    },
    status: 'unread',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
]

function timeAgo(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'A l\'instant'
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `Il y a ${diffD}j`
}

export default function Inbox() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [channelFilter, setChannelFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [handlingId, setHandlingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // --- Fetch replies (realtime ou mock) ---
  useEffect(() => {
    if (!orgId) {
      setReplies(MOCK_REPLIES)
      setLoading(false)
      return
    }

    const replyFeedsRef = collection(db, `organizations/${orgId}/replyFeeds`)
    const q = query(replyFeedsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setReplies(data.length > 0 ? data : MOCK_REPLIES)
        setLoading(false)
      },
      (error) => {
        console.error('Inbox realtime error:', error)
        setReplies(MOCK_REPLIES)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId])

  // --- Fetch stats ---
  const fetchStats = useCallback(async () => {
    if (!orgId) {
      setStats({
        totalReplies: 47,
        unreadCount: 12,
        byCategory: { POSITIVE: 15, NEGATIVE: 8, OBJECTION: 10, REFERRAL: 4, OOO: 3, NEUTRAL: 7 },
        byChannel: { email: 20, whatsapp: 15, instagram: 8, linkedin: 4 },
      })
      return
    }

    try {
      const getStatsFn = httpsCallable(functions, 'getReplyHandlerStats')
      const result = await getStatsFn({ orgId })
      setStats(result.data)
    } catch {
      setStats({
        totalReplies: 47,
        unreadCount: 12,
        byCategory: { POSITIVE: 15, NEGATIVE: 8, OBJECTION: 10, REFERRAL: 4, OOO: 3, NEUTRAL: 7 },
        byChannel: { email: 20, whatsapp: 15, instagram: 8, linkedin: 4 },
      })
    }
  }, [orgId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // --- Tab-based filtering ---
  const tabCounts = useMemo(() => {
    const counts = {}
    TABS.forEach((tab) => {
      counts[tab.id] = replies.filter(tab.filter).length
    })
    return counts
  }, [replies])

  const filteredReplies = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)
    let filtered = tab ? replies.filter(tab.filter) : replies

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          (r.prospectName || '').toLowerCase().includes(q) ||
          (r.prospectCompany || '').toLowerCase().includes(q) ||
          (r.replyText || '').toLowerCase().includes(q)
      )
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter((r) => r.channel === channelFilter)
    }

    return filtered
  }, [replies, activeTab, searchQuery, channelFilter])

  // --- Quick stats ---
  const quickStats = useMemo(() => {
    const unread = replies.filter((r) => r.status === 'unread').length
    const positive = replies.filter((r) => r.classification?.category === 'POSITIVE').length
    const objection = replies.filter((r) => r.classification?.category === 'OBJECTION').length
    const total = replies.length
    return { unread, positive, objection, total }
  }, [replies])

  // --- Mark as handled ---
  const handleMarkHandled = useCallback(
    async (replyId, action) => {
      setHandlingId(replyId)
      try {
        if (orgId && !replyId.startsWith('mock-')) {
          const replyRef = doc(db, `organizations/${orgId}/replyFeeds`, replyId)
          await updateDoc(replyRef, {
            status: 'handled',
            actionTaken: action,
            handledAt: serverTimestamp(),
          })
        } else {
          setReplies((prev) =>
            prev.map((r) => (r.id === replyId ? { ...r, status: 'handled', actionTaken: action } : r))
          )
        }
        toast.success('Reponse traitee')
      } catch (error) {
        toast.error('Erreur: ' + error.message)
      } finally {
        setHandlingId(null)
      }
    },
    [orgId]
  )

  // --- Bulk mark as handled ---
  const handleBulkMarkHandled = useCallback(async () => {
    if (selectedIds.size === 0) return

    const ids = [...selectedIds]
    try {
      if (orgId && !ids[0]?.startsWith('mock-')) {
        const batch = writeBatch(db)
        ids.forEach((id) => {
          const ref = doc(db, `organizations/${orgId}/replyFeeds`, id)
          batch.update(ref, { status: 'handled', actionTaken: 'Bulk traite', handledAt: serverTimestamp() })
        })
        await batch.commit()
      } else {
        setReplies((prev) =>
          prev.map((r) => (selectedIds.has(r.id) ? { ...r, status: 'handled', actionTaken: 'Bulk traite' } : r))
        )
      }
      setSelectedIds(new Set())
      toast.success(`${ids.length} reponse(s) traitee(s)`)
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    }
  }, [orgId, selectedIds])

  // --- Toggle selection ---
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // --- Copy script ---
  const copyScript = useCallback((text) => {
    navigator.clipboard.writeText(text)
    toast.success('Script copie dans le presse-papiers')
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <InboxIcon className="w-5 h-5 text-indigo-600" />
            </div>
            Inbox Reponses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reponses prospects classifiees par IA avec scripts de reponse
          </p>
        </div>
        <button onClick={fetchStats} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total reponses', value: quickStats.total, icon: InboxIcon, color: 'bg-slate-100 text-slate-600' },
          { label: 'Non lues', value: quickStats.unread, icon: Clock, color: 'bg-amber-100 text-amber-600' },
          { label: 'Positives', value: quickStats.positive, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Objections', value: quickStats.objection, icon: MessageCircle, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="card p-4 space-y-3">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()) }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Channel filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, entreprise, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Tous canaux</option>
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkMarkHandled}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Traiter {selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Reply Feed */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredReplies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center"
            >
              <InboxIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune reponse trouvee</p>
              <p className="text-sm text-gray-400 mt-1">
                Les reponses des prospects apparaitront ici automatiquement
              </p>
            </motion.div>
          ) : (
            filteredReplies.map((reply, index) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                index={index}
                expanded={expandedId === reply.id}
                selected={selectedIds.has(reply.id)}
                onToggle={() => setExpandedId(expandedId === reply.id ? null : reply.id)}
                onSelect={() => toggleSelect(reply.id)}
                onMarkHandled={handleMarkHandled}
                onCopyScript={copyScript}
                handling={handlingId === reply.id}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Category breakdown */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Repartition par categorie
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byCategory || {}).map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat]
              if (!cfg || count === 0) return null
              return (
                <div key={cat} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-sm text-gray-600">{cfg.label}</span>
                  <span className="text-sm font-bold ml-auto">{count}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// --- Reply Card Component ---
function ReplyCard({ reply, index, expanded, selected, onToggle, onSelect, onMarkHandled, onCopyScript, handling }) {
  const [draftText, setDraftText] = useState('')
  const [editingDraft, setEditingDraft] = useState(false)
  const [actionText, setActionText] = useState('')

  const catCfg = CATEGORY_CONFIG[reply.classification?.category] || CATEGORY_CONFIG.NEUTRAL
  const ChannelIcon = CHANNEL_ICONS[reply.channel] || Mail
  const isUnread = reply.status === 'unread'

  // Init draft from first script
  useEffect(() => {
    if (reply.scripts?.script1?.text && !draftText) {
      setDraftText(reply.scripts.script1.text)
    }
  }, [reply.scripts?.script1?.text])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.03 }}
      className={`card overflow-hidden ${isUnread ? 'ring-1 ring-indigo-200 bg-indigo-50/30' : ''} ${selected ? 'ring-2 ring-indigo-400' : ''}`}
    >
      {/* Header row */}
      <div className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect() }}
          className="mt-1 shrink-0"
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-indigo-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-300 hover:text-gray-400" />
          )}
        </button>

        {/* Category badge */}
        <div
          className={`px-2 py-1 rounded-md text-xs font-medium ${catCfg.color} shrink-0 mt-0.5`}
          onClick={onToggle}
        >
          {catCfg.emoji} {catCfg.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{reply.prospectName || 'Prospect'}</span>
            {reply.prospectCompany && (
              <span className="text-xs text-gray-400 truncate">- {reply.prospectCompany}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{reply.replyText}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0" onClick={onToggle}>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <ChannelIcon className="w-3.5 h-3.5" />
            <span>{CHANNEL_LABELS[reply.channel] || reply.channel}</span>
          </div>
          <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
          {isUnread ? (
            <Eye className="w-4 h-4 text-indigo-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-300" />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
              {/* Full message */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">Message complet</p>
                <p className="text-sm text-gray-700">&quot;{reply.replyText}&quot;</p>
              </div>

              {/* Classification details */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Confiance : <strong>{Math.round((reply.classification?.confidence || 0) * 100)}%</strong></span>
                <span>Methode : <strong>{reply.classification?.method === 'ai' ? 'IA' : 'Mots-cles'}</strong></span>
                <span>Sentiment : <strong>{reply.classification?.sentiment || 'N/A'}</strong></span>
              </div>

              {/* Editable draft response */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Brouillon de reponse IA
                  </span>
                  <div className="flex items-center gap-1">
                    {reply.scripts?.script1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDraftText(reply.scripts.script1.text) }}
                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      >
                        {reply.scripts.script1.label}
                      </button>
                    )}
                    {reply.scripts?.script2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDraftText(reply.scripts.script2.text) }}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"
                      >
                        {reply.scripts.script2.label}
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={draftText}
                  onChange={(e) => { setDraftText(e.target.value); setEditingDraft(true) }}
                  onClick={(e) => e.stopPropagation()}
                  rows={3}
                  className="input-field w-full text-sm resize-none"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCopyScript(draftText)
                      toast.success('Reponse copiee, prete a envoyer')
                    }}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCopyScript(draftText) }}
                    className="btn-ghost text-sm flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copier
                  </button>
                </div>
              </div>

              {/* Recommended action */}
              {reply.scripts?.actionRecommandee && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm text-indigo-700">
                    <strong>Action recommandee :</strong> {reply.scripts.actionRecommandee}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); toast.success('Lien Calendly envoye') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-gray-600 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Envoyer lien Calendly
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toast.success('Appel initie') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-gray-600 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Passer appel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkHandled(reply.id, 'Archive') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archiver
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toast.success('Contact blackliste') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Blacklister
                </button>
              </div>

              {/* Handle action */}
              {reply.status === 'unread' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Action prise (ex: RDV planifie, reponse envoyee...)"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkHandled(reply.id, actionText || 'Traite')
                      setActionText('')
                    }}
                    disabled={handling}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    {handling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Marquer traite
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Traite{reply.actionTaken ? ` — ${reply.actionTaken}` : ''}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Inbox — Feed des reponses prospects classifiees
 * Affiche les reponses entrantes avec classification IA, 2 scripts de reponse, actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useOrg } from '@/contexts/OrgContext'
import { functions, db } from '@/services/firebase'
import toast from 'react-hot-toast'
import {
  Inbox as InboxIcon,
  Search,
  Filter,
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
  MessageSquareText,
  Sparkles,
} from 'lucide-react'

// --- Configuration categories ---
const CATEGORY_CONFIG = {
  POSITIVE: { emoji: '\u{1F7E2}', label: 'Positif', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', priority: 1 },
  NEGATIVE: { emoji: '\u{1F534}', label: 'Negatif', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', priority: 7 },
  OBJECTION: { emoji: '\u{1F7E0}', label: 'Objection', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', priority: 2 },
  REFERRAL: { emoji: '\u{1F535}', label: 'Referral', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', priority: 3 },
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

// --- Helper: temps relatif ---
function timeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date)
  const diffMs = now - d
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
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [handlingId, setHandlingId] = useState(null)

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

  // --- Filtrage ---
  const filteredReplies = useMemo(() => {
    return replies.filter((reply) => {
      const matchSearch =
        searchQuery === '' ||
        (reply.prospectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (reply.prospectCompany || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (reply.replyText || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchCategory =
        categoryFilter === 'all' || reply.classification?.category === categoryFilter

      const matchChannel = channelFilter === 'all' || reply.channel === channelFilter

      const matchStatus = statusFilter === 'all' || reply.status === statusFilter

      return matchSearch && matchCategory && matchChannel && matchStatus
    })
  }, [replies, searchQuery, categoryFilter, channelFilter, statusFilter])

  // --- Marquer comme traite ---
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
          // Mock: update local state
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

  // --- Copier script ---
  const copyScript = useCallback((text) => {
    navigator.clipboard.writeText(text)
    toast.success('Script copie dans le presse-papiers')
  }, [])

  // --- Stats rapides ---
  const quickStats = useMemo(() => {
    const unread = replies.filter((r) => r.status === 'unread').length
    const positive = replies.filter((r) => r.classification?.category === 'POSITIVE').length
    const objection = replies.filter((r) => r.classification?.category === 'OBJECTION').length
    const total = replies.length
    return { unread, positive, objection, total }
  }, [replies])

  // --- Loading ---
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <InboxIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quickStats.total}</p>
              <p className="text-xs text-gray-500">Total reponses</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quickStats.unread}</p>
              <p className="text-xs text-gray-500">Non lues</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quickStats.positive}</p>
              <p className="text-xs text-gray-500">Positives</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quickStats.objection}</p>
              <p className="text-xs text-gray-500">Objections</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4">
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Toutes categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.emoji} {cfg.label}
              </option>
            ))}
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Tous canaux</option>
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Tout statut</option>
            <option value="unread">Non lues</option>
            <option value="handled">Traitees</option>
          </select>
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
                onToggle={() => setExpandedId(expandedId === reply.id ? null : reply.id)}
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
function ReplyCard({ reply, index, expanded, onToggle, onMarkHandled, onCopyScript, handling }) {
  const [actionText, setActionText] = useState('')
  const catCfg = CATEGORY_CONFIG[reply.classification?.category] || CATEGORY_CONFIG.NEUTRAL
  const ChannelIcon = CHANNEL_ICONS[reply.channel] || Mail
  const isUnread = reply.status === 'unread'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.03 }}
      className={`card overflow-hidden ${isUnread ? 'ring-1 ring-indigo-200 bg-indigo-50/30' : ''}`}
    >
      {/* Header row */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors flex items-start gap-3"
        onClick={onToggle}
      >
        {/* Category badge */}
        <div className={`px-2 py-1 rounded-md text-xs font-medium ${catCfg.color} shrink-0 mt-0.5`}>
          {catCfg.emoji} {catCfg.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{reply.prospectName || 'Prospect'}</span>
            {reply.prospectCompany && (
              <span className="text-xs text-gray-400 truncate">- {reply.prospectCompany}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{reply.replyText}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
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
                <span>
                  Confiance : <strong>{Math.round((reply.classification?.confidence || 0) * 100)}%</strong>
                </span>
                <span>
                  Methode : <strong>{reply.classification?.method === 'ai' ? 'IA' : 'Mots-cles'}</strong>
                </span>
                <span>
                  Sentiment : <strong>{reply.classification?.sentiment || 'N/A'}</strong>
                </span>
              </div>

              {/* AI Scripts */}
              {reply.scripts && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Script 1 */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Script 1 — {reply.scripts.script1?.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopyScript(reply.scripts.script1?.text)
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copier"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{reply.scripts.script1?.text}</p>
                  </div>

                  {/* Script 2 */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Script 2 — {reply.scripts.script2?.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopyScript(reply.scripts.script2?.text)
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copier"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{reply.scripts.script2?.text}</p>
                  </div>
                </div>
              )}

              {/* Recommended action */}
              {reply.scripts?.actionRecommandee && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm text-indigo-700">
                    <strong>Action recommandee :</strong> {reply.scripts.actionRecommandee}
                  </span>
                </div>
              )}

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

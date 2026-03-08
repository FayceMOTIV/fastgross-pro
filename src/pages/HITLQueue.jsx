import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import {
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  Mail,
  Phone,
  MessageCircle,
  Linkedin,
  User,
  Building2,
  Loader2,
  Inbox,
  AlertCircle,
  Send,
  X,
  Filter,
  Timer,
} from 'lucide-react'

const MOCK_QUEUE = [
  {
    id: 'q1',
    prospectName: 'Sophie Martin',
    company: 'TechVision',
    channel: 'email',
    message:
      "Bonjour Sophie, j'ai vu que TechVision recrute des devs React. Notre plateforme aide les entreprises tech a structurer leur prospection et generer des leads qualifies automatiquement. Seriez-vous disponible pour un echange de 15 min ?",
    intent: 'INFO_REQUEST',
    status: 'pending',
    createdAt: Date.now() - 1800000,
    expiresAt: Date.now() + 1800000,
  },
  {
    id: 'q2',
    prospectName: 'Pierre Durand',
    company: 'GreenEnergy',
    channel: 'whatsapp',
    message:
      "Bonjour Pierre, felicitations pour votre levee de fonds ! Je serais ravi d'echanger sur comment optimiser votre acquisition client avec notre solution d'automatisation multicanale.",
    intent: 'INTERESTED',
    status: 'pending',
    createdAt: Date.now() - 900000,
    expiresAt: Date.now() + 2700000,
  },
  {
    id: 'q3',
    prospectName: 'Claire Dupont',
    company: 'Mairie Lyon',
    channel: 'email',
    message:
      "Madame Dupont, suite a votre appel d'offres pour la refonte web, voici comment nous pouvons vous accompagner avec notre expertise en generation de leads B2B.",
    intent: 'MEETING_REQUEST',
    status: 'pending',
    createdAt: Date.now() - 300000,
    expiresAt: Date.now() + 3300000,
  },
  {
    id: 'q4',
    prospectName: 'Marc Lefevre',
    company: 'DataFlow',
    channel: 'linkedin',
    message:
      "Bonjour Marc, j'ai remarque votre post sur la croissance de DataFlow. Nous aidons les scale-ups a automatiser leur prospection. Interessant pour vous ?",
    intent: 'QUESTION',
    status: 'approved',
    createdAt: Date.now() - 7200000,
    expiresAt: Date.now() - 3600000,
  },
  {
    id: 'q5',
    prospectName: 'Isabelle Roux',
    company: 'EcoServices',
    channel: 'email',
    message:
      "Bonjour Isabelle, je me permets de vous contacter concernant vos enjeux de developpement commercial. Notre outil de prospection IA pourrait vous interesser.",
    intent: 'NOT_INTERESTED',
    status: 'rejected',
    createdAt: Date.now() - 5400000,
    expiresAt: Date.now() - 1800000,
  },
]

const CHANNEL_ICONS = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
}

const CHANNEL_COLORS = {
  email: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  sms: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  whatsapp: { bg: 'bg-green-100', text: 'text-green-600' },
  linkedin: { bg: 'bg-blue-100', text: 'text-blue-600' },
}

const INTENT_CONFIG = {
  INTERESTED: { label: 'Interesse', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEETING_REQUEST: { label: 'Demande RDV', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  INFO_REQUEST: { label: 'Demande info', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  QUESTION: { label: 'Question', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  NOT_INTERESTED: { label: 'Pas interesse', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

const FILTER_TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuves' },
  { key: 'rejected', label: 'Rejetes' },
]

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()))

  useEffect(() => {
    if (remaining <= 0) return

    const interval = setInterval(() => {
      const diff = Math.max(0, expiresAt - Date.now())
      setRemaining(diff)
      if (diff <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return {
    remaining,
    display: remaining > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : 'Expire',
    isUrgent: remaining > 0 && remaining < 600000, // < 10 min
    isExpired: remaining <= 0,
  }
}

function QueueCard({ item, onApprove, onReject, onModify, loading }) {
  const ChannelIcon = CHANNEL_ICONS[item.channel] || Mail
  const channelColor = CHANNEL_COLORS[item.channel] || CHANNEL_COLORS.email
  const intentConfig = INTENT_CONFIG[item.intent] || INTENT_CONFIG.QUESTION
  const countdown = useCountdown(item.expiresAt)

  const [editing, setEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState(item.message)

  const isPending = item.status === 'pending'

  const handleApproveEdited = () => {
    onApprove(item.id, editedMessage)
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedMessage(item.message)
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -200 }}
      transition={{ duration: 0.25 }}
      className="card p-5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${channelColor.bg} flex items-center justify-center`}>
            <ChannelIcon className={`w-5 h-5 ${channelColor.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-900 text-sm">{item.prospectName}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{item.company}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Intent badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${intentConfig.bg} ${intentConfig.text} ${intentConfig.border}`}
          >
            {intentConfig.label}
          </span>

          {/* Countdown */}
          {isPending && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                countdown.isExpired
                  ? 'bg-gray-100 text-gray-500'
                  : countdown.isUrgent
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gray-50 text-gray-600'
              }`}
            >
              <Timer className="w-3 h-3" />
              {countdown.display}
            </span>
          )}
        </div>
      </div>

      {/* Message preview or edit */}
      {editing ? (
        <div className="mb-4">
          <textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rows={4}
            className="input-field resize-none text-sm"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
            <button
              onClick={handleApproveEdited}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-1 font-medium"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Approuver modifie
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-700 leading-relaxed">
          <p className="line-clamp-3">{item.message}</p>
        </div>
      )}

      {/* Action buttons */}
      {isPending && !editing && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => onApprove(item.id, item.message)}
            disabled={loading}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approuver
          </button>
          <button
            onClick={() => setEditing(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm"
          >
            <Edit3 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onReject(item.id)}
            disabled={loading}
            className="flex-1 py-2 px-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Rejeter
          </button>
        </div>
      )}

      {/* Status indicator for approved/rejected */}
      {!isPending && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {item.status === 'approved' ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Approuve
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
              <XCircle className="w-4 h-4" />
              Rejete
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(item.createdAt).toLocaleString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      )}
    </motion.div>
  )
}

export default function HITLQueue() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: callHandleReply, loading: replyLoading } = useCloudFunction('handleIncomingReply')
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('pending')

  // Load queue
  useEffect(() => {
    if (isDemo) {
      setQueue(MOCK_QUEUE)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'hitlQueue'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            prospectName: data.prospectName || 'Prospect inconnu',
            company: data.company || '',
            channel: data.channel || 'email',
            message: data.message || '',
            intent: data.intent || 'QUESTION',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            expiresAt: data.expiresAt?.toMillis?.() || data.expiresAt || Date.now() + 3600000,
          }
        })
        setQueue(loaded.length > 0 ? loaded : MOCK_QUEUE)
        setLoading(false)
      },
      (err) => {
        console.error('HITL Queue listener error:', err)
        setQueue(MOCK_QUEUE)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [currentOrg?.id, isDemo])

  const handleApprove = useCallback(
    async (id, message) => {
      if (!isDemo && currentOrg?.id) {
        try {
          await callHandleReply({
            orgId: currentOrg.id,
            queueItemId: id,
            action: 'approve',
            message,
          })
        } catch (err) {
          console.error('Approve error:', err)
          toast.error("Erreur lors de l'approbation")
          return
        }
      }

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'approved' } : item
        )
      )
      toast.success('Message approuve et envoye')
    },
    [isDemo, currentOrg?.id, callHandleReply]
  )

  const handleReject = useCallback(
    async (id) => {
      if (!isDemo && currentOrg?.id) {
        try {
          await callHandleReply({
            orgId: currentOrg.id,
            queueItemId: id,
            action: 'reject',
          })
        } catch (err) {
          console.error('Reject error:', err)
          toast.error('Erreur lors du rejet')
          return
        }
      }

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'rejected' } : item
        )
      )
      toast.success('Message rejete')
    },
    [isDemo, currentOrg?.id, callHandleReply]
  )

  const filtered = queue.filter((item) => item.status === activeFilter)
  const pendingCount = queue.filter((item) => item.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F6EF7]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="page-title">File d'approbation</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-[#4F6EF7] text-white text-sm font-bold">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>Approbation manuelle activee</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {FILTER_TABS.map((tab) => {
          const count = queue.filter((item) => item.status === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-medium ${
                  activeFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="section-title mb-2">
            {activeFilter === 'pending' && 'Aucun message en attente'}
            {activeFilter === 'approved' && 'Aucun message approuve'}
            {activeFilter === 'rejected' && 'Aucun message rejete'}
          </h3>
          <p className="text-gray-500">
            {activeFilter === 'pending'
              ? 'Les messages necessitant votre approbation apparaitront ici'
              : 'Les messages traites apparaitront dans cet onglet'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filtered.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={replyLoading}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

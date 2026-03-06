import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Clock,
  User,
  Send,
  Phone,
  CalendarPlus,
  X,
  Check,
  Ban,
  ChevronRight,
  Shield,
  Zap,
  MessageSquare,
  RefreshCw,
  Loader2,
  Inbox,
} from 'lucide-react'

const URGENCY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Critique' },
  normal: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Normal' },
}

const REASON_LABELS = {
  kb_no_info: 'Pas d\'info KB',
  very_negative: 'Sentiment negatif',
  vip_lead: 'Lead VIP',
  long_conversation: 'Conversation longue',
  legal_keywords: 'Mots juridiques',
  low_confidence: 'Confiance basse',
}

// Demo data
const DEMO_ESCALATIONS = [
  {
    id: 'demo-1',
    leadId: 'lead-1',
    reason: 'vip_lead',
    urgency: 'critical',
    agentDraftReply: 'Bonjour M. Dupont, merci pour votre interet. Je comprends que le timing est important pour vous. Seriez-vous disponible cette semaine pour un echange de 15 minutes ?',
    status: 'pending',
    createdAt: { toDate: () => new Date(Date.now() - 1800000) },
    prospect: { firstName: 'Jean', lastName: 'Dupont', company: 'TechCorp SAS', email: 'jean@techcorp.fr', score: 92 },
  },
  {
    id: 'demo-2',
    leadId: 'lead-2',
    reason: 'very_negative',
    urgency: 'normal',
    agentDraftReply: 'Je comprends votre frustration et je m\'en excuse. Pourriez-vous me preciser ce qui vous a derange afin que nous puissions rectifier ?',
    status: 'pending',
    createdAt: { toDate: () => new Date(Date.now() - 7200000) },
    prospect: { firstName: 'Marie', lastName: 'Martin', company: 'Design Studio', email: 'marie@design-studio.fr', score: 45 },
  },
  {
    id: 'demo-3',
    leadId: 'lead-3',
    reason: 'legal_keywords',
    urgency: 'critical',
    agentDraftReply: 'Nous prenons tres au serieux vos preoccupations. Notre equipe juridique va examiner votre demande et nous reviendrons vers vous sous 24h.',
    status: 'pending',
    createdAt: { toDate: () => new Date(Date.now() - 3600000) },
    prospect: { firstName: 'Pierre', lastName: 'Leroy', company: 'Avocat & Associes', email: 'p.leroy@avocat.fr', score: 30 },
  },
]

function timeAgo(date) {
  if (!date) return ''
  const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'A l\'instant'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

function EscalationCard({ esc, isSelected, onClick }) {
  const urgency = URGENCY_STYLES[esc.urgency] || URGENCY_STYLES.normal
  const prospect = esc.prospect || {}
  const score = (prospect.score ?? 0) <= 10 ? (prospect.score ?? 0) * 10 : (prospect.score ?? 0)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border rounded-xl transition-all ${
        isSelected
          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
          : `${urgency.border} ${urgency.bg} hover:shadow-sm`
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
            {(prospect.firstName?.[0] || '?')}{(prospect.lastName?.[0] || '')}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {prospect.firstName} {prospect.lastName}
            </p>
            <p className="text-xs text-gray-500">{prospect.company || prospect.email}</p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgency.badge}`}>
          {urgency.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {REASON_LABELS[esc.reason] || esc.reason}
        </span>
        {score > 0 && (
          <span className="text-xs text-gray-500">Score: {score}</span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>{timeAgo(esc.createdAt)}</span>
      </div>
    </button>
  )
}

function EscalationDetail({ esc, onAction, loading }) {
  const [editedReply, setEditedReply] = useState(esc.agentDraftReply || '')
  const [crmAction, setCrmAction] = useState('')
  const urgency = URGENCY_STYLES[esc.urgency] || URGENCY_STYLES.normal
  const prospect = esc.prospect || {}

  useEffect(() => {
    setEditedReply(esc.agentDraftReply || '')
    setCrmAction('')
  }, [esc.id, esc.agentDraftReply])

  const isModified = editedReply !== (esc.agentDraftReply || '')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b ${urgency.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
              {(prospect.firstName?.[0] || '?')}{(prospect.lastName?.[0] || '')}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {prospect.firstName} {prospect.lastName}
              </h3>
              <p className="text-sm text-gray-500">
                {prospect.company && `${prospect.company} · `}{prospect.email}
              </p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${urgency.badge}`}>
            {urgency.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            {REASON_LABELS[esc.reason] || esc.reason}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{timeAgo(esc.createdAt)}</span>
        </div>
      </div>

      {/* Draft reply */}
      <div className="flex-1 p-4 overflow-y-auto">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brouillon de reponse (editable)
        </label>
        <textarea
          value={editedReply}
          onChange={(e) => setEditedReply(e.target.value)}
          rows={6}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        {isModified && (
          <p className="text-xs text-amber-600 mt-1">Reponse modifiee</p>
        )}

        {/* CRM Action */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action CRM (optionnel)
          </label>
          <div className="flex gap-2 flex-wrap">
            {['INTERESTED', 'MEETING', 'LOST'].map((action) => (
              <button
                key={action}
                onClick={() => setCrmAction(crmAction === action ? '' : action)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  crmAction === action
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {action === 'INTERESTED' && 'Interesse'}
                {action === 'MEETING' && 'RDV'}
                {action === 'LOST' && 'Perdu'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAction(isModified ? 'send_modified' : 'send_as_is', editedReply, crmAction)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isModified ? 'Envoyer modifie' : 'Envoyer tel quel'}
          </button>
          <button
            onClick={() => onAction('call', editedReply, crmAction)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Phone className="w-4 h-4" />
            Appeler
          </button>
          <button
            onClick={() => onAction('send_booking', editedReply, crmAction || 'MEETING')}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <CalendarPlus className="w-4 h-4" />
            Lien RDV
          </button>
          <button
            onClick={() => onAction('close', editedReply, crmAction)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Cloturer
          </button>
        </div>
        <button
          onClick={() => onAction('blacklist', editedReply, 'LOST')}
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Ban className="w-4 h-4" />
          Blacklister
        </button>
      </div>
    </div>
  )
}

export default function HumanInLoop() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [escalations, setEscalations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(false)

  const { callFunction } = useCloudFunction()

  // Realtime listener
  useEffect(() => {
    if (!orgId) {
      setEscalations(DEMO_ESCALATIONS)
      setSelectedId(DEMO_ESCALATIONS[0]?.id || null)
      return
    }

    const escRef = collection(db, 'organizations', orgId, 'escalations')
    const constraints = [orderBy('createdAt', 'desc'), limit(100)]
    if (filter !== 'all') {
      constraints.unshift(where('status', '==', filter))
    }

    const q = query(escRef, ...constraints)
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setEscalations(items)
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id)
      }
    })

    return () => unsub()
  }, [orgId, filter])

  // Enrich escalations with prospect data on client side (listener doesn't join)
  useEffect(() => {
    if (!orgId) return

    const enrichAll = async () => {
      const enriched = await Promise.all(
        escalations.map(async (esc) => {
          if (esc.prospect || !esc.leadId) return esc
          try {
            const { doc, getDoc } = await import('firebase/firestore')
            const prospectDoc = await getDoc(doc(db, 'organizations', orgId, 'prospects', esc.leadId))
            if (prospectDoc.exists()) {
              const p = prospectDoc.data()
              return {
                ...esc,
                prospect: {
                  firstName: p.firstName || '',
                  lastName: p.lastName || '',
                  company: p.company || '',
                  email: p.email || '',
                  score: p.score || 0,
                },
              }
            }
          } catch {
            // Ignore enrichment errors
          }
          return esc
        })
      )
      setEscalations(enriched)
    }

    if (escalations.length > 0 && !escalations[0].prospect) {
      enrichAll()
    }
  }, [escalations.length, orgId])

  const selected = escalations.find((e) => e.id === selectedId)

  const handleAction = useCallback(async (action, reply, crmAction) => {
    if (!orgId || !selectedId) {
      toast.success(`[Demo] Action: ${action}`)
      setEscalations((prev) => prev.filter((e) => e.id !== selectedId))
      setSelectedId(null)
      return
    }

    setActionLoading(true)
    try {
      await callFunction('handleEscalation', {
        orgId,
        escalationId: selectedId,
        action,
        modifiedReply: reply,
        crmAction: crmAction || undefined,
      })
      toast.success('Escalade traitee')
      setSelectedId(null)
    } catch (error) {
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }, [orgId, selectedId, callFunction])

  const pendingCount = escalations.filter((e) => e.status === 'pending').length
  const criticalCount = escalations.filter((e) => e.urgency === 'critical' && e.status === 'pending').length

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Escalades
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-sm rounded-full font-medium">
                  {pendingCount}
                </span>
              )}
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                  {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Conversations necessitant une intervention humaine
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'pending', label: 'En attente' },
              { value: 'resolved', label: 'Resolues' },
              { value: 'all', label: 'Toutes' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === tab.value
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {escalations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">Aucune escalade {filter === 'pending' ? 'en attente' : ''}</p>
            <p className="text-sm mt-1">L'agent IA gere toutes les conversations</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: List */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto p-3 space-y-2 flex-shrink-0">
            {escalations.map((esc) => (
              <EscalationCard
                key={esc.id}
                esc={esc}
                isSelected={esc.id === selectedId}
                onClick={() => setSelectedId(esc.id)}
              />
            ))}
          </div>

          {/* Right: Detail */}
          <div className="flex-1 bg-white overflow-hidden">
            {selected ? (
              <EscalationDetail
                esc={selected}
                onAction={handleAction}
                loading={actionLoading}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Selectionnez une escalade</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

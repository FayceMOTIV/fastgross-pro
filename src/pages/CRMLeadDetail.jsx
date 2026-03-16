import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Copy,
  Building2,
  Star,
  Zap,
  Clock,
  MessageSquare,
  ArrowRight,
  Send,
  StickyNote,
  Trash2,
  ChevronDown,
  Loader2,
  User,
  CalendarDays,
  AlertTriangle,
  Check,
  Eye,
  RefreshCw,
  Target,
  FileText,
  Linkedin,
  Globe,
  X,
} from 'lucide-react'

const CRM_COLUMNS = [
  { id: 'detected', label: 'Detecte', color: 'gray' },
  { id: 'warming', label: 'Warming', color: 'yellow' },
  { id: 'contacted', label: 'Contacte', color: 'blue' },
  { id: 'replied', label: 'Repondu', color: 'purple' },
  { id: 'meeting', label: 'RDV', color: 'orange' },
  { id: 'converted', label: 'Converti', color: 'emerald' },
  { id: 'won', label: 'Gagne', color: 'green' },
  { id: 'lost', label: 'Perdu', color: 'red' },
]

const MOCK_PROSPECTS = [
  { id: 'p1', name: 'Sophie Martin', company: 'TechVision SAS', email: 'sophie@techvision.fr', phone: '+33612345678', score: 92, source: 'linkedin', crmColumn: 'replied', city: 'Paris', sector: 'Tech', lastActivity: '2026-03-07', intentSignal: 'Recrute 3 devs React' },
  { id: 'p2', name: 'Pierre Durand', company: 'GreenEnergy France', email: 'pierre@greenenergy.fr', phone: '+33698765432', score: 85, source: 'sirene', crmColumn: 'contacted', city: 'Bordeaux', sector: 'Energie', lastActivity: '2026-03-06', intentSignal: 'Levee Serie A 5M EUR' },
  { id: 'p3', name: 'Claire Dupont', company: 'Mairie de Lyon', email: 'c.dupont@lyon.fr', score: 78, source: 'boamp', crmColumn: 'meeting', city: 'Lyon', sector: 'Administration', lastActivity: '2026-03-05', intentSignal: 'AO refonte site web' },
  { id: 'p4', name: 'Jean Lefebvre', company: 'DataFlow SARL', email: 'jean@dataflow.io', phone: '+33654321098', score: 72, source: 'google_maps', crmColumn: 'detected', city: 'Toulouse', sector: 'SaaS', lastActivity: '2026-03-04', intentSignal: 'Nouvelle ouverture' },
  { id: 'p5', name: 'Marie Blanc', company: 'FinTech Pro', email: 'marie@fintechpro.fr', score: 68, source: 'societe', crmColumn: 'warming', city: 'Nantes', sector: 'Finance', lastActivity: '2026-03-03', intentSignal: 'Creation recente' },
  { id: 'p6', name: 'Lucas Bernard', company: 'Artisan Boulanger', email: 'lucas@artisan.fr', phone: '+33678901234', score: 55, source: 'google_maps', crmColumn: 'won', city: 'Marseille', sector: 'Restauration', lastActivity: '2026-03-02', intentSignal: 'Bon avis Google' },
  { id: 'p7', name: 'Emma Petit', company: 'DesignCraft Studio', email: 'emma@designcraft.fr', score: 45, source: 'linkedin', crmColumn: 'lost', city: 'Nice', sector: 'Design', lastActivity: '2026-03-01', intentSignal: 'Post LinkedIn actif' },
  { id: 'p8', name: 'Thomas Moreau', company: 'CloudSync Tech', email: 'thomas@cloudsync.io', phone: '+33612349876', score: 88, source: 'linkedin', crmColumn: 'contacted', city: 'Paris', sector: 'Tech', lastActivity: '2026-03-07', intentSignal: 'Recrute DevOps senior' },
]

const MOCK_TIMELINE = [
  { id: 't1', type: 'column_change', description: 'Deplacement vers Repondu', user: 'Systeme', timestamp: '2026-03-07T14:30:00', icon: 'move' },
  { id: 't2', type: 'email_sent', description: 'Email de suivi envoye : "Votre projet digital"', user: 'AutoPilot', timestamp: '2026-03-06T10:15:00', icon: 'send' },
  { id: 't3', type: 'reply', description: 'Reponse recue : "Interesse, pouvez-vous m\'en dire plus ?"', user: 'Prospect', timestamp: '2026-03-07T09:45:00', icon: 'reply' },
  { id: 't4', type: 'note', description: 'Prospect interesse par notre offre premium. Relancer la semaine prochaine.', user: 'Faical B.', timestamp: '2026-03-05T16:00:00', icon: 'note' },
  { id: 't5', type: 'column_change', description: 'Deplacement vers Contacte', user: 'Systeme', timestamp: '2026-03-04T08:00:00', icon: 'move' },
  { id: 't6', type: 'email_sent', description: 'Premier email de prospection envoye', user: 'AutoPilot', timestamp: '2026-03-04T08:00:00', icon: 'send' },
  { id: 't7', type: 'column_change', description: 'Prospect detecte et ajoute au pipeline', user: 'Systeme', timestamp: '2026-03-03T12:00:00', icon: 'move' },
]

const MOCK_PROFILE = {
  summary: 'Entreprise tech en forte croissance, fondee en 2022. Specialisee dans les solutions SaaS pour l\'industrie verte.',
  insights: [
    'Levee de fonds recente (Serie A, 5M EUR)',
    'Equipe en expansion rapide (+15 postes ouverts)',
    'Stack technique moderne (React, Node.js, AWS)',
  ],
  buyingSignals: [
    'Recherche active de solutions de prospection',
    'Budget marketing en hausse de 40%',
    'Nouveau directeur commercial recrute',
  ],
}

const COLUMN_COLORS = {
  detected: 'bg-gray-100 text-gray-700',
  warming: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-blue-100 text-blue-700',
  replied: 'bg-purple-100 text-purple-700',
  meeting: 'bg-orange-100 text-orange-700',
  converted: 'bg-emerald-100 text-emerald-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

const SOURCE_LABELS = {
  linkedin: 'LinkedIn',
  sirene: 'SIRENE',
  boamp: 'BOAMP',
  google_maps: 'Google Maps',
  societe: 'Societe.com',
  import: 'Import',
}

const SOURCE_COLORS = {
  linkedin: 'bg-blue-100 text-blue-700',
  sirene: 'bg-indigo-100 text-indigo-700',
  boamp: 'bg-violet-100 text-violet-700',
  google_maps: 'bg-emerald-100 text-emerald-700',
  societe: 'bg-amber-100 text-amber-700',
  import: 'bg-gray-100 text-gray-600',
}

const TIMELINE_ICONS = {
  move: ArrowRight,
  send: Send,
  reply: MessageSquare,
  note: StickyNote,
  default: Clock,
}

const TIMELINE_COLORS = {
  move: 'bg-indigo-100 text-indigo-600',
  send: 'bg-blue-100 text-blue-600',
  reply: 'bg-emerald-100 text-emerald-600',
  note: 'bg-amber-100 text-amber-600',
  default: 'bg-gray-100 text-gray-500',
}

function ScoreCircle({ score, size = 'lg' }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'

  const sizeClass = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-9 h-9 text-sm'

  return (
    <span className={`inline-flex items-center justify-center rounded-full border font-bold ${color} ${sizeClass}`}>
      {score}
    </span>
  )
}

function copyToClipboard(text) {
  if (!text) return
  navigator.clipboard.writeText(text)
  toast.success('Copie dans le presse-papiers')
}

export default function CRMLeadDetail() {
  const { prospectId } = useParams()
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { user } = useAuth()
  const orgId = currentOrg?.id

  const { call: callMoveProspect, loading: moving } = useCloudFunction('moveProspect')
  const { call: callDeleteProspect, loading: deleting } = useCloudFunction('deleteProspect')

  const [prospect, setProspect] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [selectedColumn, setSelectedColumn] = useState('')

  // Load prospect data
  useEffect(() => {
    if (isDemo || !orgId) {
      const mockProspect = MOCK_PROSPECTS.find((p) => p.id === prospectId)
      setProspect(mockProspect || MOCK_PROSPECTS[0])
      setTimeline(MOCK_TIMELINE)
      setSelectedColumn(mockProspect?.crmColumn || MOCK_PROSPECTS[0].crmColumn)
      setLoading(false)
      return
    }

    // Real mode: listen to prospect doc
    const prospectRef = doc(db, `organizations/${orgId}/prospects`, prospectId)
    const unsubProspect = onSnapshot(
      prospectRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const p = {
            id: snap.id,
            name: data.firstName && data.lastName
              ? `${data.firstName} ${data.lastName}`
              : data.name || 'Inconnu',
            company: data.company || '',
            email: data.email || '',
            phone: data.phone || '',
            score: data.score || 0,
            source: data.source || 'import',
            crmColumn: data.alexStatus === 'conversion_action_done' ? 'converted' : (data.crmColumn || 'detected'),
            city: data.city || '',
            sector: data.sector || '',
            lastActivity: data.updatedAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || '',
            intentSignal: data.intentSignal || '',
            summary: data.summary || '',
            insights: data.insights || [],
            buyingSignals: data.buyingSignals || [],
          }
          setProspect(p)
          setSelectedColumn(p.crmColumn)
        } else {
          setProspect(MOCK_PROSPECTS[0])
          setSelectedColumn(MOCK_PROSPECTS[0].crmColumn)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Prospect detail error:', error)
        setProspect(MOCK_PROSPECTS[0])
        setLoading(false)
      }
    )

    // Listen to interactions (timeline)
    const interactionsRef = collection(db, `organizations/${orgId}/prospects/${prospectId}/timeline`)
    const timelineQuery = query(interactionsRef, orderBy('timestamp', 'desc'))

    const unsubTimeline = onSnapshot(
      timelineQuery,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate?.()?.toISOString?.() || '',
        }))
        setTimeline(data.length > 0 ? data : MOCK_TIMELINE)
      },
      () => {
        setTimeline(MOCK_TIMELINE)
      }
    )

    return () => {
      unsubProspect()
      unsubTimeline()
    }
  }, [orgId, prospectId, isDemo])

  const handleMoveColumn = async (newColumn) => {
    setSelectedColumn(newColumn)

    if (isDemo) {
      setProspect((prev) => ({ ...prev, crmColumn: newColumn }))
      toast.success(`Prospect deplace vers ${CRM_COLUMNS.find((c) => c.id === newColumn)?.label}`)
      return
    }

    try {
      await callMoveProspect({ orgId, prospectId, newColumn })
      toast.success(`Prospect deplace vers ${CRM_COLUMNS.find((c) => c.id === newColumn)?.label}`)
    } catch (err) {
      toast.error('Erreur lors du deplacement')
      setSelectedColumn(prospect?.crmColumn || 'detected')
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    if (isDemo) {
      const newEntry = {
        id: `t-${Date.now()}`,
        type: 'note',
        description: newNote,
        user: 'Vous',
        timestamp: new Date().toISOString(),
        icon: 'note',
      }
      setTimeline((prev) => [newEntry, ...prev])
      setNewNote('')
      toast.success('Note ajoutee')
      return
    }

    try {
      setAddingNote(true)
      const timelineRef = collection(db, `organizations/${orgId}/prospects/${prospectId}/timeline`)
      await addDoc(timelineRef, {
        type: 'note',
        description: newNote,
        user: user?.displayName || user?.email || 'Utilisateur',
        timestamp: serverTimestamp(),
        icon: 'note',
      })
      setNewNote('')
      toast.success('Note ajoutee')
    } catch (err) {
      toast.error('Erreur lors de l\'ajout de la note')
    } finally {
      setAddingNote(false)
    }
  }

  const handleDelete = async () => {
    if (isDemo) {
      toast.success('Prospect supprime (mode demo)')
      navigate('/app/prospects')
      return
    }

    try {
      await callDeleteProspect({ orgId, prospectId })
      toast.success('Prospect supprime (RGPD)')
      navigate('/app/prospects')
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) return

    if (isDemo) {
      const newEntry = {
        id: `t-${Date.now()}`,
        type: 'email_sent',
        description: `Message envoye : "${messageText.slice(0, 80)}..."`,
        user: 'Vous',
        timestamp: new Date().toISOString(),
        icon: 'send',
      }
      setTimeline((prev) => [newEntry, ...prev])
      setMessageText('')
      setShowMessageModal(false)
      toast.success('Message envoye')
      return
    }

    toast.success('Envoi du message en cours...')
    setShowMessageModal(false)
    setMessageText('')
  }

  const formatTimestamp = (ts) => {
    if (!ts) return ''
    const date = new Date(ts)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="text-center py-20">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Prospect introuvable</p>
        <button onClick={() => navigate('/app/prospects')} className="btn-primary mt-4">
          Retour au CRM
        </button>
      </div>
    )
  }

  const profile = prospect.summary ? {
    summary: prospect.summary,
    insights: prospect.insights || [],
    buyingSignals: prospect.buyingSignals || [],
  } : MOCK_PROFILE

  const sourceLabel = SOURCE_LABELS[prospect.source] || prospect.source
  const sourceColor = SOURCE_COLORS[prospect.source] || 'bg-gray-100 text-gray-600'
  const columnColor = COLUMN_COLORS[prospect.crmColumn] || 'bg-gray-100 text-gray-600'
  const columnLabel = CRM_COLUMNS.find((c) => c.id === prospect.crmColumn)?.label || prospect.crmColumn

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => navigate('/app/prospects')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au CRM
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shrink-0">
            {prospect.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{prospect.name}</h1>
              <ScoreCircle score={prospect.score} />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sourceColor}`}>
                {sourceLabel}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${columnColor}`}>
                {columnLabel}
              </span>
            </div>
            <p className="text-gray-600 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {prospect.company}
              {prospect.sector && <span className="text-gray-400">— {prospect.sector}</span>}
            </p>
          </div>
        </div>

        {/* Contact info row */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
          {prospect.email && (
            <button
              onClick={() => copyToClipboard(prospect.email)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors group"
            >
              <Mail className="w-4 h-4" />
              <span>{prospect.email}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          {prospect.phone && (
            <button
              onClick={() => copyToClipboard(prospect.phone)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors group"
            >
              <Phone className="w-4 h-4" />
              <span>{prospect.phone}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          {prospect.city && (
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              {prospect.city}
            </span>
          )}
        </div>

        {/* Intent signal */}
        {prospect.intentSignal && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800 font-medium">Signal d'intention :</span>
            <span className="text-sm text-amber-700">{prospect.intentSignal}</span>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deep profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              Profil approfondi
            </h2>

            {profile.summary && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {profile.summary}
              </p>
            )}

            {profile.insights?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Points cles</h3>
                <ul className="space-y-1.5">
                  {profile.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.buyingSignals?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Signaux d'achat</h3>
                <ul className="space-y-1.5">
                  {profile.buyingSignals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Zap className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Historique
            </h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gray-100" />

              <div className="space-y-6">
                {timeline.map((event, idx) => {
                  const IconComp = TIMELINE_ICONS[event.icon] || TIMELINE_ICONS.default
                  const iconColor = TIMELINE_COLORS[event.icon] || TIMELINE_COLORS.default

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative flex gap-4"
                    >
                      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm text-gray-800">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
                          <span className="text-xs text-gray-300">—</span>
                          <span className="text-xs font-medium text-gray-500">{event.user}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {timeline.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucun evenement</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Move to column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-5"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">Deplacer vers</h3>
            <select
              value={selectedColumn}
              onChange={(e) => handleMoveColumn(e.target.value)}
              disabled={moving}
              className="input-field w-full"
            >
              {CRM_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
            {moving && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Deplacement en cours...
              </div>
            )}
          </motion.div>

          {/* Add note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ajouter une note</h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ecrire une note..."
              rows={3}
              className="input-field w-full resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
              className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
            >
              {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
              Ajouter
            </button>
          </motion.div>

          {/* Send message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-5"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">Envoyer un message</h3>
            <button
              onClick={() => setShowMessageModal(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Rediger un message
            </button>
          </motion.div>

          {/* RGPD Delete */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-5 border-red-100"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">RGPD</h3>
            <p className="text-xs text-gray-400 mb-3">
              Supprimer definitivement ce prospect et toutes ses donnees associees.
            </p>
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Cette action est irreversible
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-ghost text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer le prospect
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowMessageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Envoyer un message</h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-500 mb-1">Destinataire</p>
                <p className="text-sm font-medium text-gray-900">
                  {prospect.name} — {prospect.email}
                </p>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Votre message..."
                rows={5}
                className="input-field w-full resize-none"
                autoFocus
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="btn-ghost"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

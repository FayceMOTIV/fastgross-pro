import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'
import {
  List,
  Kanban,
  Search,
  Loader2,
  Users,
  MapPin,
  Building2,
  Star,
  GripVertical,
  Eye,
  Linkedin,
  Globe,
  FileText,
  X,
} from 'lucide-react'

const CRM_COLUMNS = [
  { id: 'detected', label: 'Detecte', color: 'gray' },
  { id: 'warming', label: 'Warming', color: 'yellow' },
  { id: 'contacted', label: 'Contacte', color: 'blue' },
  { id: 'replied', label: 'Repondu', color: 'purple' },
  { id: 'meeting', label: 'RDV', color: 'orange' },
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

const COLUMN_BG = {
  gray: { header: 'bg-gray-100', dot: 'bg-gray-400', border: 'border-gray-200', dropBg: 'bg-gray-50' },
  yellow: { header: 'bg-yellow-100', dot: 'bg-yellow-500', border: 'border-yellow-200', dropBg: 'bg-yellow-50' },
  blue: { header: 'bg-blue-100', dot: 'bg-blue-500', border: 'border-blue-200', dropBg: 'bg-blue-50' },
  purple: { header: 'bg-purple-100', dot: 'bg-purple-500', border: 'border-purple-200', dropBg: 'bg-purple-50' },
  orange: { header: 'bg-orange-100', dot: 'bg-orange-500', border: 'border-orange-200', dropBg: 'bg-orange-50' },
  green: { header: 'bg-green-100', dot: 'bg-green-500', border: 'border-green-200', dropBg: 'bg-green-50' },
  red: { header: 'bg-red-100', dot: 'bg-red-400', border: 'border-red-200', dropBg: 'bg-red-50' },
}

const SOURCE_COLORS = {
  linkedin: 'bg-blue-100 text-blue-700',
  sirene: 'bg-indigo-100 text-indigo-700',
  boamp: 'bg-violet-100 text-violet-700',
  google_maps: 'bg-emerald-100 text-emerald-700',
  societe: 'bg-amber-100 text-amber-700',
  import: 'bg-gray-100 text-gray-600',
  instagram: 'bg-pink-100 text-pink-700',
  facebook: 'bg-sky-100 text-sky-700',
}

const SOURCE_LABELS = {
  linkedin: 'LI',
  sirene: 'SIR',
  boamp: 'BO',
  google_maps: 'GM',
  societe: 'SOC',
  import: 'IMP',
  instagram: 'IG',
  facebook: 'FB',
}

function ScoreCircle({ score }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'

  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${color}`}>
      {score}
    </span>
  )
}

function KanbanCard({ prospect, onDragStart, onClick }) {
  const sourceColor = SOURCE_COLORS[prospect.source] || 'bg-gray-100 text-gray-600'
  const sourceLabel = SOURCE_LABELS[prospect.source] || '?'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, prospect)}
      onClick={() => onClick(prospect)}
      className="card-hover p-3 cursor-grab active:cursor-grabbing group transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
            {prospect.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{prospect.name}</p>
            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
              <Building2 className="w-3 h-3 shrink-0" />
              {prospect.company}
            </p>
          </div>
        </div>
        <ScoreCircle score={prospect.score} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceColor}`}>
          {sourceLabel}
        </span>
        <span className="text-[10px] text-gray-400">{prospect.lastActivity}</span>
      </div>

      {/* Grip indicator on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  )
}

export default function CRMKanban() {
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const orgId = currentOrg?.id

  const { call: callMoveProspect } = useCloudFunction('moveProspect')

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [draggingProspect, setDraggingProspect] = useState(null)

  // Load prospects
  useEffect(() => {
    if (isDemo || !orgId) {
      setProspects(MOCK_PROSPECTS)
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, `organizations/${orgId}/prospects`)
    const q = query(prospectsRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().firstName && d.data().lastName
            ? `${d.data().firstName} ${d.data().lastName}`
            : d.data().name || 'Inconnu',
          company: d.data().company || '',
          email: d.data().email || '',
          phone: d.data().phone || '',
          score: d.data().score || 0,
          source: d.data().source || 'import',
          crmColumn: d.data().crmColumn || 'detected',
          city: d.data().city || '',
          sector: d.data().sector || '',
          lastActivity: d.data().updatedAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || '',
          intentSignal: d.data().intentSignal || '',
        }))
        setProspects(data.length > 0 ? data : MOCK_PROSPECTS)
        setLoading(false)
      },
      (error) => {
        console.error('CRMKanban realtime error:', error)
        setProspects(MOCK_PROSPECTS)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId, isDemo])

  // Filter prospects by search
  const filteredProspects = useMemo(() => {
    if (!searchQuery.trim()) return prospects
    const q = searchQuery.toLowerCase()
    return prospects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q)
    )
  }, [prospects, searchQuery])

  // Group by column
  const columnProspects = useMemo(() => {
    const groups = {}
    CRM_COLUMNS.forEach((col) => {
      groups[col.id] = []
    })
    filteredProspects.forEach((p) => {
      const col = p.crmColumn || 'detected'
      if (groups[col]) {
        groups[col].push(p)
      } else {
        groups.detected.push(p)
      }
    })
    // Sort each column by score desc
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (b.score || 0) - (a.score || 0))
    })
    return groups
  }, [filteredProspects])

  // Drag and drop handlers
  const handleDragStart = useCallback((e, prospect) => {
    setDraggingProspect(prospect)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', prospect.id)
    // Make the drag image semi-transparent
    if (e.target) {
      e.target.style.opacity = '0.5'
    }
  }, [])

  const handleDragEnd = useCallback((e) => {
    setDragOverColumn(null)
    setDraggingProspect(null)
    if (e.target) {
      e.target.style.opacity = '1'
    }
  }, [])

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(async (e, targetColumnId) => {
    e.preventDefault()
    setDragOverColumn(null)

    const prospectId = e.dataTransfer.getData('text/plain')
    if (!prospectId) return

    const prospect = prospects.find((p) => p.id === prospectId)
    if (!prospect || prospect.crmColumn === targetColumnId) {
      setDraggingProspect(null)
      return
    }

    const targetLabel = CRM_COLUMNS.find((c) => c.id === targetColumnId)?.label || targetColumnId

    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, crmColumn: targetColumnId } : p))
    )

    if (isDemo) {
      toast.success(`${prospect.name} deplace vers ${targetLabel}`)
      setDraggingProspect(null)
      return
    }

    try {
      await callMoveProspect({ orgId, prospectId, newColumn: targetColumnId })
      toast.success(`${prospect.name} deplace vers ${targetLabel}`)
    } catch (err) {
      // Revert on error
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, crmColumn: prospect.crmColumn } : p))
      )
      toast.error('Erreur lors du deplacement')
    }

    setDraggingProspect(null)
  }, [prospects, orgId, isDemo, callMoveProspect])

  const handleCardClick = useCallback((prospect) => {
    navigate(`/app/crm/lead/${prospect.id}`)
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM — Vue Pipeline</h1>
          <p className="text-gray-500 mt-1">
            {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''} dans le pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/crm/list')}
            className="btn-secondary flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Vue liste
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un prospect..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field w-full pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-4 min-w-max">
          {CRM_COLUMNS.map((column) => {
            const colStyle = COLUMN_BG[column.color] || COLUMN_BG.gray
            const cards = columnProspects[column.id] || []
            const isDropTarget = dragOverColumn === column.id

            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-[260px] shrink-0 flex flex-col"
              >
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl ${colStyle.header}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${colStyle.dot}`} />
                  <span className="text-sm font-semibold text-gray-800">{column.label}</span>
                  <span className="ml-auto text-xs font-medium text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex-1 min-h-[200px] rounded-b-xl border-2 border-dashed transition-all duration-200 p-2 space-y-2 ${
                    isDropTarget
                      ? `${colStyle.dropBg} ${colStyle.border} border-solid shadow-inner`
                      : 'border-transparent bg-gray-50/50'
                  }`}
                >
                  {cards.map((prospect) => (
                    <KanbanCard
                      key={prospect.id}
                      prospect={prospect}
                      onDragStart={handleDragStart}
                      onClick={handleCardClick}
                    />
                  ))}

                  {cards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <Users className="w-6 h-6 mb-1" />
                      <span className="text-xs">Aucun prospect</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Drag indicator */}
      <AnimatePresence>
        {draggingProspect && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50"
          >
            Deposez {draggingProspect.name} dans une colonne
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

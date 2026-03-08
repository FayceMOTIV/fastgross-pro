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
  Search,
  Filter,
  Download,
  Eye,
  Kanban,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Users,
  MapPin,
  Linkedin,
  Globe,
  FileText,
  Building2,
  Star,
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

const ITEMS_PER_PAGE = 10

const COLUMN_COLORS = {
  detected: 'bg-gray-100 text-gray-700',
  warming: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-blue-100 text-blue-700',
  replied: 'bg-purple-100 text-purple-700',
  meeting: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
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
  linkedin: 'LinkedIn',
  sirene: 'SIRENE',
  boamp: 'BOAMP',
  google_maps: 'Google Maps',
  societe: 'Societe.com',
  import: 'Import',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

const SOURCE_ICONS = {
  linkedin: Linkedin,
  sirene: FileText,
  boamp: FileText,
  google_maps: MapPin,
  societe: Building2,
  import: Download,
  instagram: Globe,
  facebook: Globe,
}

function ScoreCircle({ score }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'

  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full border text-sm font-bold ${color}`}>
      {score}
    </span>
  )
}

function SourceBadge({ source }) {
  const colorClass = SOURCE_COLORS[source] || 'bg-gray-100 text-gray-600'
  const label = SOURCE_LABELS[source] || source
  const Icon = SOURCE_ICONS[source] || Globe

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function ColumnBadge({ column }) {
  const colorClass = COLUMN_COLORS[column] || 'bg-gray-100 text-gray-600'
  const colDef = CRM_COLUMNS.find((c) => c.id === column)
  const label = colDef?.label || column

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

export default function CRMList() {
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const orgId = currentOrg?.id

  const { call: callExport, loading: exporting } = useCloudFunction('exportProspectsCSV')

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [columnFilter, setColumnFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreRange, setScoreRange] = useState('all')
  const [sortField, setSortField] = useState('score')
  const [sortDir, setSortDir] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)

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
        console.error('CRMList realtime error:', error)
        setProspects(MOCK_PROSPECTS)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId, isDemo])

  // Filtered & sorted prospects
  const filteredProspects = useMemo(() => {
    let result = [...prospects]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      )
    }

    // Column filter
    if (columnFilter !== 'all') {
      result = result.filter((p) => p.crmColumn === columnFilter)
    }

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter((p) => p.source === sourceFilter)
    }

    // Score range filter
    if (scoreRange !== 'all') {
      if (scoreRange === 'high') result = result.filter((p) => p.score >= 80)
      else if (scoreRange === 'medium') result = result.filter((p) => p.score >= 60 && p.score < 80)
      else if (scoreRange === 'low') result = result.filter((p) => p.score < 60)
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal
      if (sortField === 'score') {
        aVal = a.score || 0
        bVal = b.score || 0
      } else if (sortField === 'name') {
        aVal = (a.name || '').toLowerCase()
        bVal = (b.name || '').toLowerCase()
      } else if (sortField === 'lastActivity') {
        aVal = a.lastActivity || ''
        bVal = b.lastActivity || ''
      } else if (sortField === 'company') {
        aVal = (a.company || '').toLowerCase()
        bVal = (b.company || '').toLowerCase()
      } else {
        aVal = a[sortField] || ''
        bVal = b[sortField] || ''
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [prospects, searchQuery, columnFilter, sourceFilter, scoreRange, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProspects.length / ITEMS_PER_PAGE))
  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProspects.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProspects, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, columnFilter, sourceFilter, scoreRange])

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('desc')
      return field
    })
  }, [])

  const handleExportCSV = async () => {
    if (isDemo) {
      toast.success('Export CSV lance (mode demo)')
      return
    }
    try {
      await callExport({ orgId })
      toast.success('Export CSV en cours de generation')
    } catch (err) {
      toast.error('Erreur lors de l\'export CSV')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
  }

  // Unique sources for filter
  const availableSources = useMemo(() => {
    const sources = new Set(prospects.map((p) => p.source))
    return Array.from(sources).sort()
  }, [prospects])

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
          <h1 className="text-2xl font-bold text-gray-900">CRM — Vue Liste</h1>
          <p className="text-gray-500 mt-1">
            {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/crm/kanban')}
            className="btn-secondary flex items-center gap-2"
          >
            <Kanban className="w-4 h-4" />
            Vue pipeline
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, entreprise ou email..."
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

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />

            <select
              value={columnFilter}
              onChange={(e) => setColumnFilter(e.target.value)}
              className="input-field text-sm py-1.5 px-3"
            >
              <option value="all">Toutes les colonnes</option>
              {CRM_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input-field text-sm py-1.5 px-3"
            >
              <option value="all">Toutes les sources</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
              ))}
            </select>

            <select
              value={scoreRange}
              onChange={(e) => setScoreRange(e.target.value)}
              className="input-field text-sm py-1.5 px-3"
            >
              <option value="all">Tous les scores</option>
              <option value="high">Chaud (80+)</option>
              <option value="medium">Tiede (60-79)</option>
              <option value="low">Froid (&lt;60)</option>
            </select>

            {(columnFilter !== 'all' || sourceFilter !== 'all' || scoreRange !== 'all') && (
              <button
                onClick={() => {
                  setColumnFilter('all')
                  setSourceFilter('all')
                  setScoreRange('all')
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Reinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Nom
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    Entreprise
                    <SortIcon field="company" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1">
                    Score
                    <SortIcon field="score" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colonne
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Ville
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 hidden md:table-cell"
                  onClick={() => handleSort('lastActivity')}
                >
                  <div className="flex items-center gap-1">
                    Derniere activite
                    <SortIcon field="lastActivity" />
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {paginatedProspects.map((prospect, idx) => (
                  <motion.tr
                    key={prospect.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/crm/lead/${prospect.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
                          {prospect.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{prospect.name}</p>
                          <p className="text-xs text-gray-400 hidden sm:block">{prospect.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{prospect.company}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreCircle score={prospect.score} />
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={prospect.source} />
                    </td>
                    <td className="px-4 py-3">
                      <ColumnBadge column={prospect.crmColumn} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {prospect.city || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-500">{prospect.lastActivity || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/app/crm/lead/${prospect.id}`)
                        }}
                        className="btn-ghost text-sm flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredProspects.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun prospect trouve</p>
              <p className="text-gray-400 text-sm mt-1">Modifiez vos filtres ou ajoutez des prospects</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredProspects.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
              <span className="hidden sm:inline"> — {filteredProspects.length} resultat{filteredProspects.length > 1 ? 's' : ''}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Precedent
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-40"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

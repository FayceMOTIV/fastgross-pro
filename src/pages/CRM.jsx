/**
 * CRM.jsx — Pipeline CRM avec Kanban, vue Liste, et vue Chauds
 * Utilise le KanbanBoard refactorise avec @hello-pangea/dnd
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { updateProspect, bulkUpdateProspects } from '@/services/prospects'
import KanbanBoard, { CRM_COLUMNS, mapLegacyStatus } from '@/components/KanbanBoard'
import LeadDrawer from '@/components/LeadDrawer'
import toast from 'react-hot-toast'
import {
  Kanban,
  List,
  Flame,
  Search,
  Filter,
  Download,
  Users,
  Phone,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
  Mail,
} from 'lucide-react'

// Demo data for when no org is connected
const DEMO_LEADS = [
  { id: 'demo-1', firstName: 'Jean', lastName: 'Dupont', company: 'Boulangerie Dupont', email: 'jean@boulangerie-dupont.fr', phone: '+33612345678', score: 85, source: 'google-maps', status: 'new', crmColumn: 'NEW', sequenceStatus: 'active', intentSignal: 'Site web visite', createdAt: new Date(Date.now() - 3600000), updatedAt: new Date(Date.now() - 3600000), channels: { email: { available: true }, whatsapp: { available: true } } },
  { id: 'demo-2', firstName: 'Marie', lastName: 'Martin', company: 'Salon Belle & Zen', email: 'marie@belleetzen.fr', score: 72, source: 'instagram', status: 'contacted', crmColumn: 'CONTACTED', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 7200000), channels: { email: { available: true } } },
  { id: 'demo-3', firstName: 'Pierre', lastName: 'Lefevre', company: 'Garage Lefevre', email: 'pierre@garage-lefevre.fr', score: 91, source: 'linkedin', status: 'replied', crmColumn: 'INTERESTED', intentSignal: 'Demande de prix', createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 1800000), channels: { email: { available: true }, sms: { available: true } } },
  { id: 'demo-4', firstName: 'Sophie', lastName: 'Bernard', company: 'Fleuriste Sophie', email: 'sophie@fleuriste-sophie.fr', score: 95, source: 'google-maps', status: 'replied', crmColumn: 'MEETING', meetingDate: new Date(Date.now() + 86400000), createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 3600000), channels: { email: { available: true }, whatsapp: { available: true } } },
  { id: 'demo-5', firstName: 'Luc', lastName: 'Moreau', company: 'Restaurant Le Gourmet', email: 'luc@legourmet.fr', score: 98, source: 'referral', status: 'converted', crmColumn: 'SIGNED', createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(Date.now() - 86400000), channels: { email: { available: true } } },
  { id: 'demo-6', firstName: 'Thomas', lastName: 'Petit', company: 'Agence Immobiliere TP', email: 'thomas@agence-tp.fr', score: 30, source: 'import', status: 'lost', crmColumn: 'LOST', createdAt: new Date(Date.now() - 1209600000), updatedAt: new Date(Date.now() - 604800000), channels: { email: { available: true } } },
  { id: 'demo-7', firstName: 'Emma', lastName: 'Roux', company: 'Yoga Studio Emma', email: 'emma@yogastudio.fr', score: 78, source: 'facebook', status: 'new', crmColumn: 'NEW', sequenceStatus: 'active', createdAt: new Date(Date.now() - 7200000), updatedAt: new Date(Date.now() - 1200000), channels: { email: { available: true }, instagram: { available: true } } },
  { id: 'demo-8', firstName: 'Lucas', lastName: 'Durand', company: 'Pizza Express', email: 'lucas@pizzaexpress.fr', score: 65, source: 'google-maps', status: 'contacted', crmColumn: 'CONTACTED', createdAt: new Date(Date.now() - 43200000), updatedAt: new Date(Date.now() - 21600000), channels: { email: { available: true }, sms: { available: true } } },
]

const VIEWS = [
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'list', label: 'Liste', icon: List },
  { id: 'hot', label: 'Chauds', icon: Flame },
]

export default function CRM() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [sortField, setSortField] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  // Realtime listener
  useEffect(() => {
    if (!orgId) {
      setLeads(DEMO_LEADS)
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, `organizations/${orgId}/prospects`)
    const q = query(prospectsRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setLeads(data.length > 0 ? data : DEMO_LEADS)
        setLoading(false)
      },
      (error) => {
        console.error('CRM realtime error:', error)
        setLeads(DEMO_LEADS)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId])

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const normalizedScore = (lead.score ?? 0) <= 10 ? (lead.score ?? 0) * 10 : (lead.score ?? 0)

      const matchSearch =
        !searchQuery ||
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchSource = sourceFilter === 'all' || lead.source === sourceFilter
      const matchScore = normalizedScore >= scoreFilter

      return matchSearch && matchSource && matchScore
    })
  }, [leads, searchQuery, sourceFilter, scoreFilter])

  // Hot leads: score > 70 AND updated in last 72h
  const hotLeads = useMemo(() => {
    const cutoff = Date.now() - 72 * 3600 * 1000
    return filteredLeads.filter((lead) => {
      const score = (lead.score ?? 0) <= 10 ? (lead.score ?? 0) * 10 : (lead.score ?? 0)
      const updatedAt = lead.updatedAt?.toDate?.() || lead.updatedAt
      const ts = updatedAt instanceof Date ? updatedAt.getTime() : Date.now()
      return score > 70 && ts > cutoff
    }).sort((a, b) => {
      const scoreA = (a.score ?? 0) <= 10 ? (a.score ?? 0) * 10 : (a.score ?? 0)
      const scoreB = (b.score ?? 0) <= 10 ? (b.score ?? 0) * 10 : (b.score ?? 0)
      return scoreB - scoreA
    })
  }, [filteredLeads])

  // Stats
  const stats = useMemo(() => {
    const total = leads.length
    const contacted = leads.filter((l) => (l.crmColumn || mapLegacyStatus(l.status)) === 'CONTACTED').length
    const interested = leads.filter((l) => (l.crmColumn || mapLegacyStatus(l.status)) === 'INTERESTED').length
    const meetings = leads.filter((l) => (l.crmColumn || mapLegacyStatus(l.status)) === 'MEETING').length
    const signed = leads.filter((l) => (l.crmColumn || mapLegacyStatus(l.status)) === 'SIGNED').length
    return { total, contacted, interested, meetings, signed }
  }, [leads])

  // Unique sources for filter
  const sources = useMemo(() => {
    const set = new Set(leads.map((l) => l.source).filter(Boolean))
    return [...set].sort()
  }, [leads])

  // Handle CRM column change from Kanban
  const handleColumnChange = useCallback(
    async (leadId, newColumn) => {
      if (!orgId || leadId.startsWith('demo-')) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, crmColumn: newColumn } : l))
        )
        toast.success(`Lead deplace vers ${CRM_COLUMNS.find((c) => c.id === newColumn)?.label}`)
        return
      }

      try {
        await updateProspect(orgId, leadId, { crmColumn: newColumn })
        toast.success(`Lead deplace vers ${CRM_COLUMNS.find((c) => c.id === newColumn)?.label}`)
      } catch (error) {
        toast.error('Erreur: ' + error.message)
      }
    },
    [orgId]
  )

  // Open lead drawer
  const handleLeadClick = useCallback((lead) => {
    setSelectedLead(lead)
    setDrawerOpen(true)
  }, [])

  // Lead action from Kanban
  const handleLeadAction = useCallback((lead, action) => {
    toast.success(`Action ${action} pour ${lead.firstName} ${lead.lastName}`)
  }, [])

  // Sort for list view
  const sortedLeads = useMemo(() => {
    const list = view === 'hot' ? hotLeads : filteredLeads
    return [...list].sort((a, b) => {
      let valA, valB
      if (sortField === 'score') {
        valA = (a.score ?? 0) <= 10 ? (a.score ?? 0) * 10 : (a.score ?? 0)
        valB = (b.score ?? 0) <= 10 ? (b.score ?? 0) * 10 : (b.score ?? 0)
      } else if (sortField === 'name') {
        valA = `${a.firstName} ${a.lastName}`.toLowerCase()
        valB = `${b.firstName} ${b.lastName}`.toLowerCase()
      } else if (sortField === 'company') {
        valA = (a.company || '').toLowerCase()
        valB = (b.company || '').toLowerCase()
      } else {
        valA = a[sortField] || 0
        valB = b[sortField] || 0
      }
      if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      return sortDir === 'asc' ? valA - valB : valB - valA
    })
  }, [filteredLeads, hotLeads, view, sortField, sortDir])

  // Toggle sort
  const toggleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
    },
    [sortField]
  )

  // Toggle select
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Select all
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedLeads.map((l) => l.id)))
    }
  }, [selectedIds, sortedLeads])

  // Bulk action
  const handleBulkAction = useCallback(
    async (column) => {
      if (selectedIds.size === 0) return
      const ids = [...selectedIds]

      if (!orgId || ids[0]?.startsWith('demo-')) {
        setLeads((prev) =>
          prev.map((l) => (selectedIds.has(l.id) ? { ...l, crmColumn: column } : l))
        )
        setSelectedIds(new Set())
        toast.success(`${ids.length} leads deplaces`)
        return
      }

      try {
        await bulkUpdateProspects(orgId, ids, { crmColumn: column })
        setSelectedIds(new Set())
        toast.success(`${ids.length} leads deplaces vers ${CRM_COLUMNS.find((c) => c.id === column)?.label}`)
      } catch (error) {
        toast.error('Erreur: ' + error.message)
      }
    },
    [orgId, selectedIds]
  )

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Prenom', 'Nom', 'Email', 'Telephone', 'Entreprise', 'Score', 'Colonne', 'Source']
    const rows = sortedLeads.map((l) => [
      l.firstName || '',
      l.lastName || '',
      l.email || '',
      l.phone || '',
      l.company || '',
      (l.score ?? 0) <= 10 ? (l.score ?? 0) * 10 : (l.score ?? 0),
      l.crmColumn || mapLegacyStatus(l.status),
      l.source || '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${sortedLeads.length} leads exportes`)
  }, [sortedLeads])

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
              <Kanban className="w-5 h-5 text-indigo-600" />
            </div>
            CRM Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerez votre pipeline de prospection avec vue Kanban, liste et leads chauds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'bg-slate-100 text-slate-600' },
          { label: 'Contactes', value: stats.contacted, icon: Mail, color: 'bg-amber-100 text-amber-600' },
          { label: 'Interesses', value: stats.interested, icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
          { label: 'RDV ce mois', value: stats.meetings, icon: Calendar, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Signes', value: stats.signed, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
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

      {/* View toggle + Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <v.icon className="w-4 h-4" />
                {v.label}
                {v.id === 'hot' && hotLeads.length > 0 && (
                  <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                    {hotLeads.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">Toutes sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Score filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Score min:</span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={scoreFilter}
              onChange={(e) => setScoreFilter(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="text-xs font-medium text-gray-700 w-8">{scoreFilter}</span>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3"
          >
            <span className="text-sm text-gray-600 font-medium">
              {selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}
            </span>
            {CRM_COLUMNS.filter((c) => !c.collapsed).map((col) => (
              <button
                key={col.id}
                onClick={() => handleBulkAction(col.id)}
                className="text-xs px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                → {col.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Content */}
      {view === 'kanban' && (
        <KanbanBoard
          leads={filteredLeads}
          onLeadClick={handleLeadClick}
          onStatusChange={handleColumnChange}
          onAction={handleLeadAction}
        />
      )}

      {(view === 'list' || view === 'hot') && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === sortedLeads.length && sortedLeads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                    />
                  </th>
                  {[
                    { id: 'name', label: 'Nom' },
                    { id: 'company', label: 'Entreprise' },
                    { id: 'score', label: 'Score' },
                    { id: 'source', label: 'Source' },
                    { id: 'crmColumn', label: 'Etape' },
                  ].map((col) => (
                    <th
                      key={col.id}
                      onClick={() => toggleSort(col.id)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={`w-3 h-3 ${sortField === col.id ? 'text-indigo-500' : 'text-gray-300'}`} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead) => {
                  const normalizedScore = (lead.score ?? 0) <= 10 ? (lead.score ?? 0) * 10 : (lead.score ?? 0)
                  const column = CRM_COLUMNS.find((c) => c.id === (lead.crmColumn || mapLegacyStatus(lead.status)))

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors ${
                        selectedIds.has(lead.id) ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                            {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {lead.firstName} {lead.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.company || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${scoreColor(normalizedScore)}`}>
                          {normalizedScore}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                          {lead.source || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${column?.lightBg || 'bg-gray-50'} ${column?.border || 'border-gray-200'} border`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${column?.color || 'bg-gray-400'}`} />
                          {column?.label || 'Nouveau'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLeadAction(lead, 'email')}
                            className="p-1.5 rounded-md hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLeadAction(lead, 'call')}
                            className="p-1.5 rounded-md hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Appel"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLeadAction(lead, 'meeting')}
                            className="p-1.5 rounded-md hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                            title="RDV"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {sortedLeads.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun lead trouve</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedLead(null) }}
      />
    </div>
  )
}

function scoreColor(score) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100 border-emerald-200'
  if (score >= 60) return 'text-amber-700 bg-amber-100 border-amber-200'
  if (score >= 40) return 'text-orange-700 bg-orange-100 border-orange-200'
  return 'text-gray-600 bg-gray-100 border-gray-200'
}

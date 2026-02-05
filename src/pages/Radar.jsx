import { useState } from 'react'
import { useLeads, useClients } from '@/hooks/useFirestore'
import LeadTable from '@/components/LeadTable'
import KanbanBoard from '@/components/KanbanBoard'
import LeadDrawer from '@/components/LeadDrawer'
import { Tooltip } from '@/components/Tooltip'
import { exportToCsv } from '@/utils/exportCsv'
import toast from 'react-hot-toast'
import {
  Radar as RadarIcon,
  Filter,
  Search,
  Download,
  Plus,
  Flame,
  ThermometerSun,
  Snowflake,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'

// Helper to safely format dates (handles both Firestore Timestamps and JS Dates)
const formatDate = (date) => {
  if (!date) return ''
  try {
    // If it's a Firestore Timestamp, convert to Date
    const jsDate = date.toDate ? date.toDate() : new Date(date)
    return jsDate.toLocaleDateString('fr-FR')
  } catch {
    return ''
  }
}

export default function Radar() {
  const { leads, loading, update: updateLead } = useLeads()
  const { clients } = useClients()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterClient, setFilterClient] = useState('all')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'kanban'
  const [selectedLead, setSelectedLead] = useState(null)

  const statusLabels = {
    new: 'Nouveau',
    contacted: 'Contacté',
    opened: 'A ouvert',
    replied: 'A répondu',
    converted: 'Converti',
  }

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLead(leadId, { status: newStatus })
      toast.success(`Statut mis à jour : ${statusLabels[newStatus] || newStatus}`)
    } catch (err) {
      console.error('Error updating lead status:', err)
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const handleLeadClick = (lead) => {
    setSelectedLead(lead)
  }

  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast.error('Aucun lead à exporter')
      return
    }
    const exportData = filteredLeads.map(lead => ({
      Prénom: lead.firstName || '',
      Nom: lead.lastName || '',
      Email: lead.email || '',
      Entreprise: lead.company || '',
      Poste: lead.jobTitle || '',
      Statut: statusLabels[lead.status] || lead.status,
      Score: lead.score || 0,
      'Dernier contact': formatDate(lead.lastContactedAt),
    }))
    exportToCsv(exportData, 'leads_face_media')
    toast.success('Export CSV téléchargé')
  }

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus
    const matchesClient = filterClient === 'all' || lead.clientId === filterClient
    return matchesSearch && matchesStatus && matchesClient
  })

  // Score distribution for chart
  const scoreDistribution = [
    { range: '0-2', count: leads.filter((l) => l.score <= 2).length, color: '#3d3d4f' },
    { range: '3-4', count: leads.filter((l) => l.score >= 3 && l.score <= 4).length, color: '#575772' },
    { range: '5-6', count: leads.filter((l) => l.score >= 5 && l.score <= 6).length, color: '#fbbf24' },
    { range: '7-8', count: leads.filter((l) => l.score >= 7 && l.score <= 8).length, color: '#00d49a' },
    { range: '9-10', count: leads.filter((l) => l.score >= 9).length, color: '#2fe8ad' },
  ]

  const hotCount = leads.filter((l) => l.score >= 7).length
  const warmCount = leads.filter((l) => l.score >= 4 && l.score < 7).length
  const coldCount = leads.filter((l) => l.score < 4).length

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <RadarIcon className="w-8 h-8 text-amber-400" />
            Radar
          </h1>
          <p className="text-dark-400 mt-1">Suivez et priorisez vos leads par score d'engagement</p>
        </div>
        <div className="flex gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-dark-700 overflow-hidden">
            <Tooltip content="Vue liste">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Vue Kanban">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Importer des leads
          </button>
        </div>
      </div>

      {/* Score summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4 border-brand-500/10">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Flame className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <p className="stat-value text-brand-400">{hotCount}</p>
            <p className="stat-label">Leads chauds (7+)</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ThermometerSun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="stat-value text-amber-400">{warmCount}</p>
            <p className="stat-label">Leads tièdes (4-6)</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dark-700/50 flex items-center justify-center">
            <Snowflake className="w-6 h-6 text-dark-400" />
          </div>
          <div>
            <p className="stat-value text-dark-400">{coldCount}</p>
            <p className="stat-label">Leads froids (0-3)</p>
          </div>
        </div>
      </div>

      {/* Score distribution chart */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Distribution des scores</h2>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={scoreDistribution}>
            <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#6d6d8a', fontSize: 12 }} />
            <YAxis hide />
            <RechartsTooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="glass-card px-3 py-2 text-xs">
                    <span className="text-white">{payload[0].value} leads</span>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {scoreDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-2.5"
            placeholder="Rechercher un lead..."
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-auto py-2.5"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="contacted">Contacté</option>
          <option value="opened">A ouvert</option>
          <option value="replied">A répondu</option>
          <option value="converted">Converti</option>
        </select>

        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="input-field w-auto py-2.5"
        >
          <option value="all">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Leads view - Table or Kanban */}
      {viewMode === 'table' ? (
        <LeadTable leads={filteredLeads} onRowClick={handleLeadClick} />
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          onLeadClick={handleLeadClick}
          onStatusChange={handleStatusChange}
        />
      )}

      {filteredLeads.length > 0 && viewMode === 'table' && (
        <p className="text-xs text-dark-500 text-center">
          {filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''} affiché{filteredLeads.length > 1 ? 's' : ''}
          {filterStatus !== 'all' || filterClient !== 'all' || searchTerm ? ' (filtré)' : ''}
        </p>
      )}

      {/* Lead drawer */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  )
}

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'
import {
  Search,
  Loader2,
  Users,
  MapPin,
  Building2,
  Star,
  Eye,
  Linkedin,
  Globe,
  Mail,
  Phone,
  Download,
  Filter,
  X,
  ChevronRight,
  Clock,
  MessageSquare,
  ArrowRight,
  Zap,
  Target,
  CalendarCheck,
  Trophy,
  XCircle,
  Flame,
  Shield,
  Activity,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'

// ─── Pipeline Columns ────────────────────────────────────────────────

const PIPELINE_COLUMNS = [
  { id: 'nouveau', label: 'Nouveau', color: 'gray', icon: Users },
  { id: 'warming', label: 'Warming', color: 'yellow', icon: Flame },
  { id: 'contacted', label: 'Contacte', color: 'blue', icon: Mail },
  { id: 'replied', label: 'Repondu', color: 'purple', icon: MessageSquare },
  { id: 'qualified', label: 'Qualifie', color: 'indigo', icon: Target },
  { id: 'call_booked', label: 'Call Booke', color: 'orange', icon: CalendarCheck },
  { id: 'closed', label: 'Closed', color: 'green', icon: Trophy },
  { id: 'lost', label: 'Lost', color: 'red', icon: XCircle },
]

const COLUMN_STYLES = {
  gray: { header: 'bg-gray-100', dot: 'bg-gray-400', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' },
  yellow: { header: 'bg-yellow-50', dot: 'bg-yellow-500', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  blue: { header: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  purple: { header: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  indigo: { header: 'bg-indigo-50', dot: 'bg-indigo-500', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  orange: { header: 'bg-orange-50', dot: 'bg-orange-500', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  green: { header: 'bg-green-50', dot: 'bg-green-500', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  red: { header: 'bg-red-50', dot: 'bg-red-400', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
}

const SOURCE_LABELS = {
  linkedin: 'LinkedIn',
  google_maps: 'Google Maps',
  sirene: 'SIRENE',
  reddit: 'Reddit',
  job_posting: 'Offre emploi',
  new_domain: 'Nouveau domaine',
  tech_stack: 'Tech Stack',
  review_mining: 'Review Mining',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  manual: 'Manuel',
  import: 'Import',
  phantom: 'PhantomBuster',
}

const STATUS_MAP = {
  new: 'nouveau',
  detected: 'nouveau',
  warming: 'warming',
  contacted: 'contacted',
  replied: 'replied',
  qualified: 'qualified',
  call_booked: 'call_booked',
  meeting: 'call_booked',
  closed: 'closed',
  won: 'closed',
  lost: 'lost',
  disqualified: 'lost',
}

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_PROSPECTS = [
  { id: 'p1', name: 'Sophie Martin', company: 'TechVision SAS', title: 'CEO', email: 'sophie@techvision.fr', phone: '+33612345678', linkedinUrl: 'https://linkedin.com/in/sophie-martin', website: 'techvision.fr', score: 92, source: 'linkedin', status: 'replied', city: 'Paris', sector: 'Tech', signal_type: 'job_posting', techSignals: ['React', 'Node.js', 'AWS'], createdAt: new Date('2026-03-01'), lastActivity: new Date('2026-03-12'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-03-05', summary: 'Email intro envoye' }, { type: 'email', direction: 'inbound', date: '2026-03-08', summary: 'Reponse positive, interesse' }, { type: 'whatsapp', direction: 'outbound', date: '2026-03-10', summary: 'Relance WhatsApp' }] },
  { id: 'p2', name: 'Pierre Durand', company: 'GreenEnergy France', title: 'CTO', email: 'pierre@greenenergy.fr', phone: '+33698765432', score: 85, source: 'sirene', status: 'contacted', city: 'Bordeaux', sector: 'Energie', signal_type: 'new_domain', createdAt: new Date('2026-03-02'), lastActivity: new Date('2026-03-10'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-03-06', summary: 'Premier email' }] },
  { id: 'p3', name: 'Claire Dupont', company: 'Mairie de Lyon', title: 'Directrice Com', email: 'c.dupont@lyon.fr', score: 78, source: 'google_maps', status: 'call_booked', city: 'Lyon', sector: 'Administration', signal_type: 'review_mining', createdAt: new Date('2026-02-28'), lastActivity: new Date('2026-03-11'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-03-01', summary: 'Email prospection' }, { type: 'email', direction: 'inbound', date: '2026-03-03', summary: 'Reponse + questions' }, { type: 'sms', direction: 'outbound', date: '2026-03-05', summary: 'Confirmation RDV' }] },
  { id: 'p4', name: 'Jean Lefebvre', company: 'DataFlow SARL', title: 'Fondateur', email: 'jean@dataflow.io', phone: '+33654321098', score: 72, source: 'reddit', status: 'nouveau', city: 'Toulouse', sector: 'SaaS', signal_type: 'reddit_intent', techSignals: ['Python', 'FastAPI'], createdAt: new Date('2026-03-10'), lastActivity: new Date('2026-03-10'), interactions: [] },
  { id: 'p5', name: 'Marie Blanc', company: 'FinTech Pro', title: 'Head of Growth', email: 'marie@fintechpro.fr', score: 68, source: 'linkedin', status: 'warming', city: 'Nantes', sector: 'Finance', signal_type: 'tech_stack', createdAt: new Date('2026-03-08'), lastActivity: new Date('2026-03-09'), interactions: [{ type: 'linkedin', direction: 'outbound', date: '2026-03-09', summary: 'Profil visite' }] },
  { id: 'p6', name: 'Lucas Bernard', company: 'Artisan Boulanger', title: 'Gerant', email: 'lucas@artisan.fr', phone: '+33678901234', score: 55, source: 'google_maps', status: 'closed', city: 'Marseille', sector: 'Restauration', signal_type: 'review_mining', createdAt: new Date('2026-02-15'), lastActivity: new Date('2026-03-08'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-02-20', summary: 'Email intro' }, { type: 'email', direction: 'inbound', date: '2026-02-23', summary: 'Interesse' }, { type: 'sms', direction: 'outbound', date: '2026-02-25', summary: 'Proposition RDV' }, { type: 'call', direction: 'outbound', date: '2026-03-01', summary: 'Appel decouverte' }, { type: 'email', direction: 'outbound', date: '2026-03-05', summary: 'Proposition commerciale' }] },
  { id: 'p7', name: 'Emma Petit', company: 'DesignCraft Studio', title: 'Directrice Artistique', email: 'emma@designcraft.fr', score: 45, source: 'instagram', status: 'lost', city: 'Nice', sector: 'Design', signal_type: 'tech_stack', createdAt: new Date('2026-02-20'), lastActivity: new Date('2026-03-04'), interactions: [{ type: 'instagram', direction: 'outbound', date: '2026-02-22', summary: 'DM Instagram' }, { type: 'email', direction: 'outbound', date: '2026-02-25', summary: 'Email follow-up' }, { type: 'email', direction: 'inbound', date: '2026-03-04', summary: 'Pas interesse' }] },
  { id: 'p8', name: 'Thomas Moreau', company: 'CloudSync Tech', title: 'VP Engineering', email: 'thomas@cloudsync.io', phone: '+33612349876', linkedinUrl: 'https://linkedin.com/in/thomas-moreau', website: 'cloudsync.io', score: 88, source: 'linkedin', status: 'qualified', city: 'Paris', sector: 'Tech', signal_type: 'job_posting', techSignals: ['React', 'TypeScript', 'Kubernetes'], createdAt: new Date('2026-03-01'), lastActivity: new Date('2026-03-13'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-03-03', summary: 'Email intro technique' }, { type: 'email', direction: 'inbound', date: '2026-03-06', summary: 'Questions sur le produit' }, { type: 'whatsapp', direction: 'outbound', date: '2026-03-10', summary: 'Demo planifiee' }] },
  { id: 'p9', name: 'Lise Fournier', company: 'Cabinet Fournier', title: 'Associee', email: 'lise@cabinetfournier.fr', score: 62, source: 'sirene', status: 'contacted', city: 'Strasbourg', sector: 'Juridique', signal_type: 'new_domain', createdAt: new Date('2026-03-05'), lastActivity: new Date('2026-03-07'), interactions: [{ type: 'email', direction: 'outbound', date: '2026-03-07', summary: 'Email personnalise' }] },
  { id: 'p10', name: 'Karim Benali', company: 'KBDev Consulting', title: 'Consultant Senior', email: 'karim@kbdev.fr', phone: '+33645678901', score: 76, source: 'reddit', status: 'warming', city: 'Lyon', sector: 'Conseil', signal_type: 'reddit_intent', techSignals: ['Java', 'Spring Boot'], createdAt: new Date('2026-03-09'), lastActivity: new Date('2026-03-11'), interactions: [{ type: 'linkedin', direction: 'outbound', date: '2026-03-10', summary: 'Like post' }, { type: 'linkedin', direction: 'outbound', date: '2026-03-11', summary: 'Commentaire post' }] },
]

// ─── Score Badge ─────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'text-green-700 bg-green-100' : score >= 60 ? 'text-yellow-700 bg-yellow-100' : score >= 40 ? 'text-orange-700 bg-orange-100' : 'text-red-700 bg-red-100'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      <Star className="w-3 h-3" />
      {score}
    </span>
  )
}

// ─── Prospect Card (Kanban) ──────────────────────────────────────────

function ProspectCard({ prospect, onClick }) {
  return (
    <div
      onClick={() => onClick(prospect)}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 truncate">{prospect.name}</p>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            {prospect.company || 'N/A'}
          </p>
        </div>
        <ScoreBadge score={prospect.score || 0} />
      </div>

      {prospect.title && (
        <p className="text-xs text-gray-400 mb-1.5 truncate">{prospect.title}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {prospect.source && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600">
            {SOURCE_LABELS[prospect.source] || prospect.source}
          </span>
        )}
        {prospect.signal_type && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600">
            <Zap className="w-2.5 h-2.5 mr-0.5" />
            {prospect.signal_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {prospect.city && (
        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-0.5">
          <MapPin className="w-2.5 h-2.5" />
          {prospect.city}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {formatDate(prospect.lastActivity || prospect.createdAt)}
        </span>
        {(prospect.interactions?.length || 0) > 0 && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <MessageSquare className="w-2.5 h-2.5" />
            {prospect.interactions.length}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Detail Panel ────────────────────────────────────────────────────

function ProspectDetailPanel({ prospect, onClose, onMove }) {
  if (!prospect) return null

  const statusLabel = PIPELINE_COLUMNS.find(c => c.id === mapStatus(prospect.status))?.label || prospect.status

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{prospect.name}</h2>
            <p className="text-sm text-gray-500">{prospect.company} {prospect.title ? `— ${prospect.title}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Score + Status */}
          <div className="flex items-center gap-3">
            <ScoreBadge score={prospect.score || 0} />
            <span className="text-sm text-gray-600">Statut : <strong>{statusLabel}</strong></span>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</h3>
            {prospect.email && (
              <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600">
                <Mail className="w-4 h-4 text-gray-400" /> {prospect.email}
              </a>
            )}
            {prospect.phone && (
              <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600">
                <Phone className="w-4 h-4 text-gray-400" /> {prospect.phone}
              </a>
            )}
            {prospect.linkedinUrl && (
              <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600">
                <Linkedin className="w-4 h-4 text-gray-400" /> LinkedIn
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {prospect.website && (
              <a href={`https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600">
                <Globe className="w-4 h-4 text-gray-400" /> {prospect.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Intelligence */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Intelligence</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Source</span>
                <p className="font-medium text-gray-700">{SOURCE_LABELS[prospect.source] || prospect.source || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Signal</span>
                <p className="font-medium text-gray-700">{prospect.signal_type?.replace(/_/g, ' ') || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Secteur</span>
                <p className="font-medium text-gray-700">{prospect.sector || prospect.niche || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Zone</span>
                <p className="font-medium text-gray-700">{prospect.city || prospect.zone || 'N/A'}</p>
              </div>
            </div>
            {prospect.techSignals?.length > 0 && (
              <div>
                <span className="text-xs text-gray-400">Tech Stack</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prospect.techSignals.map((tech, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium">
                      {typeof tech === 'string' ? tech : tech.type || tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Move to column */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deplacer</h3>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_COLUMNS.map(col => {
                const isActive = mapStatus(prospect.status) === col.id
                const style = COLUMN_STYLES[col.color]
                return (
                  <button
                    key={col.id}
                    onClick={() => !isActive && onMove(prospect.id, col.id)}
                    disabled={isActive}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      isActive ? `${style.badge} ring-2 ring-offset-1 ring-indigo-400` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {col.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interactions Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Historique ({prospect.interactions?.length || 0} interactions)
            </h3>
            {prospect.interactions?.length > 0 ? (
              <div className="space-y-3">
                {[...prospect.interactions].reverse().map((inter, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      inter.direction === 'inbound' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {inter.direction === 'inbound' ? <ArrowRight className="w-3 h-3 rotate-180" /> : <ArrowRight className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 capitalize">{inter.type}</span>
                        <span className="text-[10px] text-gray-400">{inter.date}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{inter.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucune interaction</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Filters Bar ─────────────────────────────────────────────────────

function FiltersBar({ filters, setFilters, sources, onExportCSV }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Rechercher un prospect..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Toggle filters */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
          open ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filtres
        {(filters.source || filters.scoreMin || filters.scoreMax) && (
          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
        )}
      </button>

      {/* Export CSV */}
      <button
        onClick={onExportCSV}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>

      {/* Filter dropdowns */}
      {open && (
        <div className="w-full flex items-center gap-3 pt-2 flex-wrap">
          {/* Source filter */}
          <select
            value={filters.source}
            onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toutes sources</option>
            {sources.map(s => (
              <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
            ))}
          </select>

          {/* Score min */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Score min</label>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.scoreMin}
              onChange={e => setFilters(f => ({ ...f, scoreMin: e.target.value }))}
              className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Score max */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Score max</label>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.scoreMax}
              onChange={e => setFilters(f => ({ ...f, scoreMax: e.target.value }))}
              className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Clear */}
          {(filters.source || filters.scoreMin || filters.scoreMax) && (
            <button
              onClick={() => setFilters(f => ({ ...f, source: '', scoreMin: '', scoreMax: '' }))}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────

function mapStatus(status) {
  return STATUS_MAP[status] || status || 'nouveau'
}

function formatDate(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = Math.round((now - d) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function exportToCSV(prospects) {
  const headers = ['Nom', 'Entreprise', 'Titre', 'Email', 'Telephone', 'Score', 'Source', 'Signal', 'Statut', 'Ville', 'Secteur']
  const rows = prospects.map(p => [
    p.name, p.company, p.title, p.email, p.phone, p.score,
    SOURCE_LABELS[p.source] || p.source, p.signal_type, p.status, p.city, p.sector,
  ])

  const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function ProspectHub() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const orgId = currentOrg?.id
  const { call: moveProspect } = useCloudFunction('moveProspect')

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ search: '', source: '', scoreMin: '', scoreMax: '' })
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [mobileTab, setMobileTab] = useState('nouveau')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Realtime listener
  useEffect(() => {
    if (isDemo) {
      setProspects(MOCK_PROSPECTS)
      setLoading(false)
      return
    }
    if (!orgId) return

    setLoading(true)
    const q = query(
      collection(db, `organizations/${orgId}/prospects`),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        interactions: d.data().interactions || [],
      }))
      setProspects(data)
      setLoading(false)
    }, err => {
      console.error('ProspectHub listener error:', err)
      setLoading(false)
    })

    return unsub
  }, [orgId, isDemo])

  // Available sources for filter
  const availableSources = useMemo(() => {
    const sources = new Set(prospects.map(p => p.source).filter(Boolean))
    return [...sources].sort()
  }, [prospects])

  // Filtered prospects
  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const match = [p.name, p.company, p.email, p.title, p.city, p.sector]
          .filter(Boolean).some(v => v.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filters.source && p.source !== filters.source) return false
      if (filters.scoreMin && (p.score || 0) < Number(filters.scoreMin)) return false
      if (filters.scoreMax && (p.score || 0) > Number(filters.scoreMax)) return false
      return true
    })
  }, [prospects, filters])

  // Group by pipeline column
  const grouped = useMemo(() => {
    const map = {}
    for (const col of PIPELINE_COLUMNS) map[col.id] = []
    for (const p of filtered) {
      const col = mapStatus(p.status || p.crmColumn)
      if (map[col]) map[col].push(p)
      else map.nouveau.push(p)
    }
    return map
  }, [filtered])

  // Move prospect
  const handleMove = useCallback(async (prospectId, newStatus) => {
    if (isDemo) {
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: newStatus } : p))
      toast.success('Prospect deplace')
      return
    }

    try {
      await moveProspect({ orgId, prospectId, newColumn: newStatus })
      toast.success('Prospect deplace')
      setSelected(s => s?.id === prospectId ? { ...s, status: newStatus } : s)
    } catch (err) {
      toast.error('Erreur : ' + err.message)
    }
  }, [orgId, isDemo, moveProspect])

  // Stats
  const stats = useMemo(() => ({
    total: filtered.length,
    hot: filtered.filter(p => (p.score || 0) >= 80).length,
    replied: grouped.replied?.length || 0,
    closed: grouped.closed?.length || 0,
  }), [filtered, grouped])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Prospect Hub
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Pipeline complete de prospection</p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] text-gray-400 uppercase">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{stats.hot}</p>
              <p className="text-[10px] text-gray-400 uppercase">Hot</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-600">{stats.replied}</p>
              <p className="text-[10px] text-gray-400 uppercase">Repondu</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{stats.closed}</p>
              <p className="text-[10px] text-gray-400 uppercase">Closed</p>
            </div>
          </div>
        </div>

        <FiltersBar
          filters={filters}
          setFilters={setFilters}
          sources={availableSources}
          onExportCSV={() => exportToCSV(filtered)}
        />
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : isMobile ? (
        /* Mobile: status tabs + vertical list */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2 gap-1 flex-shrink-0">
            {PIPELINE_COLUMNS.map(col => {
              const count = (grouped[col.id] || []).length
              const style = COLUMN_STYLES[col.color]
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileTab(col.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    mobileTab === col.id
                      ? 'border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {col.label}
                  {count > 0 && <span className={`px-1 py-0.5 rounded text-[10px] ${style.badge}`}>{count}</span>}
                </button>
              )
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(grouped[mobileTab] || []).length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Aucun prospect</p>
              </div>
            ) : (
              (grouped[mobileTab] || []).map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer active:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-gray-900 truncate flex-1">{p.name}</p>
                    <ScoreBadge score={p.score || 0} />
                  </div>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    {p.company || 'N/A'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      {p.source && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600">
                          {SOURCE_LABELS[p.source] || p.source}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(p.lastActivity || p.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Desktop: kanban board */
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 min-w-max h-full">
            {PIPELINE_COLUMNS.map(col => {
              const items = grouped[col.id] || []
              const style = COLUMN_STYLES[col.color]
              const Icon = col.icon

              return (
                <div key={col.id} className="w-[260px] flex-shrink-0 flex flex-col">
                  {/* Column header */}
                  <div className={`${style.header} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className="text-sm font-semibold text-gray-800">{col.label}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  {/* Column body */}
                  <div className={`flex-1 border-l border-r border-b ${style.border} rounded-b-lg bg-gray-50/50 p-2 space-y-2 overflow-y-auto`}>
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-gray-300">
                        <Icon className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">Aucun prospect</p>
                      </div>
                    ) : (
                      items.map(p => (
                        <ProspectCard key={p.id} prospect={p} onClick={setSelected} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <ProspectDetailPanel
          prospect={selected}
          onClose={() => setSelected(null)}
          onMove={handleMove}
        />
      )}
    </div>
  )
}

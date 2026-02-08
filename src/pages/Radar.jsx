import { useState, useMemo } from 'react'
import {
  Target,
  Flame,
  ThermometerSun,
  Snowflake,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Building2,
  ChevronRight,
  ArrowUpRight,
  Eye,
  Send,
  Clock,
  Check,
  X,
  User,
} from 'lucide-react'

// Mock leads with scores
const mockLeads = [
  {
    id: '1',
    name: 'Jean Dupont',
    company: 'TechCorp',
    email: 'jean@techcorp.fr',
    phone: '+33 6 12 34 56 78',
    score: 92,
    category: 'hot',
    lastInteraction: '2h',
    scoring: {
      profile: 18,
      size: 20,
      engagement: 28,
      signals: 16,
      recency: 10,
    },
    status: 'qualified',
    emailsOpened: 4,
    replies: 2,
    industry: 'SaaS',
  },
  {
    id: '2',
    name: 'Marie Martin',
    company: 'InnovatLab',
    email: 'marie@innovatlab.com',
    phone: '+33 6 98 76 54 32',
    score: 78,
    category: 'hot',
    lastInteraction: '1j',
    scoring: {
      profile: 16,
      size: 18,
      engagement: 24,
      signals: 12,
      recency: 8,
    },
    status: 'engaged',
    emailsOpened: 3,
    replies: 1,
    industry: 'Conseil',
  },
  {
    id: '3',
    name: 'Pierre Bernard',
    company: 'GrowthCo',
    email: 'pierre@growthco.fr',
    phone: null,
    score: 65,
    category: 'warm',
    lastInteraction: '3j',
    scoring: {
      profile: 14,
      size: 15,
      engagement: 18,
      signals: 10,
      recency: 8,
    },
    status: 'contacted',
    emailsOpened: 2,
    replies: 0,
    industry: 'Marketing',
  },
  {
    id: '4',
    name: 'Sophie Leroy',
    company: 'DataFlow',
    email: 'sophie@dataflow.io',
    phone: '+33 6 45 67 89 01',
    score: 52,
    category: 'warm',
    lastInteraction: '5j',
    scoring: {
      profile: 12,
      size: 14,
      engagement: 12,
      signals: 8,
      recency: 6,
    },
    status: 'contacted',
    emailsOpened: 1,
    replies: 0,
    industry: 'Tech',
  },
  {
    id: '5',
    name: 'Thomas Petit',
    company: 'CloudStart',
    email: 'thomas@cloudstart.fr',
    phone: null,
    score: 35,
    category: 'cold',
    lastInteraction: '2sem',
    scoring: {
      profile: 10,
      size: 12,
      engagement: 5,
      signals: 4,
      recency: 4,
    },
    status: 'new',
    emailsOpened: 0,
    replies: 0,
    industry: 'Cloud',
  },
  {
    id: '6',
    name: 'Julie Moreau',
    company: 'FastRetail',
    email: 'julie@fastretail.com',
    phone: null,
    score: 15,
    category: 'ice',
    lastInteraction: '1mois',
    scoring: {
      profile: 6,
      size: 4,
      engagement: 2,
      signals: 1,
      recency: 2,
    },
    status: 'new',
    emailsOpened: 0,
    replies: 0,
    industry: 'Retail',
  },
]

const categories = {
  hot: { label: 'Hot', icon: Flame, color: 'red', bg: 'bg-red-50', text: 'text-red-600', range: '80-100' },
  warm: { label: 'Warm', icon: ThermometerSun, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', range: '50-79' },
  cold: { label: 'Cold', icon: Snowflake, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', range: '20-49' },
  ice: { label: 'Ice', icon: Snowflake, color: 'gray', bg: 'bg-gray-50', text: 'text-gray-500', range: '0-19' },
}

const scoringLabels = {
  profile: 'Profil complet',
  size: 'Taille entreprise',
  engagement: 'Engagement',
  signals: 'Signaux achat',
  recency: 'Recence',
}

// Score gauge component
function ScoreGauge({ score, size = 'lg' }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (score >= 80) return '#ef4444'
    if (score >= 50) return '#f97316'
    if (score >= 20) return '#3b82f6'
    return '#9ca3af'
  }

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${size === 'sm' ? 'text-lg' : 'text-3xl'} font-bold text-gray-900`}>{score}</span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
    </div>
  )
}

// Score breakdown component
function ScoreBreakdown({ scoring }) {
  return (
    <div className="space-y-3">
      {Object.entries(scoring).map(([key, value]) => (
        <div key={key}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{scoringLabels[key]}</span>
            <span className="font-medium text-gray-900">{value}/20</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${(value / 20) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Lead card component
function LeadCard({ lead, onSelect, isSelected }) {
  const category = categories[lead.category]
  const CategoryIcon = category.icon

  return (
    <div
      onClick={() => onSelect(lead)}
      className={`bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
        isSelected ? 'border-violet-300 shadow-lg' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{lead.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {lead.company}
              </p>
            </div>
          </div>
          <ScoreGauge score={lead.score} size="sm" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${category.bg} ${category.text}`}>
            <CategoryIcon className="w-3 h-3" />
            {category.label}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lead.lastInteraction}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-gray-500">
              <Eye className="w-4 h-4" />
              {lead.emailsOpened}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Send className="w-4 h-4" />
              {lead.replies}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

export default function Radar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)

  const filteredLeads = useMemo(() => {
    return mockLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || lead.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const stats = useMemo(() => ({
    hot: mockLeads.filter((l) => l.category === 'hot').length,
    warm: mockLeads.filter((l) => l.category === 'warm').length,
    cold: mockLeads.filter((l) => l.category === 'cold').length,
    ice: mockLeads.filter((l) => l.category === 'ice').length,
    total: mockLeads.length,
  }), [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900">Radar</h1>
        <p className="text-gray-500 mt-1">Scoring IA et priorisation de vos leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { key: 'all', label: 'Total', count: stats.total, color: 'violet' },
          { key: 'hot', label: 'Hot', count: stats.hot, color: 'red', icon: Flame },
          { key: 'warm', label: 'Warm', count: stats.warm, color: 'orange', icon: ThermometerSun },
          { key: 'cold', label: 'Cold', count: stats.cold, color: 'blue', icon: Snowflake },
          { key: 'ice', label: 'Ice', count: stats.ice, color: 'gray', icon: Snowflake },
        ].map((stat) => {
          const Icon = stat.icon || Target
          return (
            <button
              key={stat.key}
              onClick={() => setSelectedCategory(stat.key)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === stat.key
                  ? `border-${stat.color}-300 bg-${stat.color}-50`
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 text-${stat.color}-500`} />
                <span className={`text-2xl font-bold text-${stat.color}-600`}>{stat.count}</span>
              </div>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un lead..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun lead trouve</h3>
              <p className="text-gray-500">Modifiez vos filtres pour voir plus de resultats</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={setSelectedLead}
                  isSelected={selectedLead?.id === lead.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Lead Detail */}
        <div className="lg:col-span-1">
          {selectedLead ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-6">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{selectedLead.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categories[selectedLead.category].bg} ${categories[selectedLead.category].text}`}>
                    {categories[selectedLead.category].label}
                  </span>
                </div>
                <div className="flex items-center justify-center mb-6">
                  <ScoreGauge score={selectedLead.score} size="lg" />
                </div>
                <ScoreBreakdown scoring={selectedLead.scoring} />
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Entreprise</p>
                  <p className="font-medium text-gray-900">{selectedLead.company}</p>
                  <p className="text-sm text-gray-500">{selectedLead.industry}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Contact</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {selectedLead.email}
                    </p>
                    {selectedLead.phone && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {selectedLead.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-violet-50">
                    <p className="text-xs text-violet-600 mb-1">Emails ouverts</p>
                    <p className="text-xl font-bold text-violet-700">{selectedLead.emailsOpened}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <p className="text-xs text-emerald-600 mb-1">Reponses</p>
                    <p className="text-xl font-bold text-emerald-700">{selectedLead.replies}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Message
                  </button>
                  <button className="py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Selectionnez un lead</h3>
              <p className="text-sm text-gray-500">Cliquez sur un lead pour voir son scoring detaille</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

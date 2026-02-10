import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Users,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Eye,
  MousePointer,
  Reply,
  Calendar,
  Download,
  ChevronDown,
  DollarSign,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Mock data for charts
const weeklyData = [
  { week: 'S1', sent: 120, opened: 78, replied: 12 },
  { week: 'S2', sent: 150, opened: 98, replied: 18 },
  { week: 'S3', sent: 180, opened: 125, replied: 24 },
  { week: 'S4', sent: 200, opened: 140, replied: 32 },
]

const channelData = [
  { name: 'Email', value: 65, color: '#8b5cf6' },
  { name: 'SMS', value: 20, color: '#3b82f6' },
  { name: 'WhatsApp', value: 15, color: '#22c55e' },
]

const funnelData = [
  { stage: 'Contactes', value: 500, percent: 100 },
  { stage: 'Ouverts', value: 325, percent: 65 },
  { stage: 'Cliques', value: 145, percent: 29 },
  { stage: 'Repondus', value: 68, percent: 13.6 },
  { stage: 'RDV', value: 24, percent: 4.8 },
]

const periods = [
  { id: 'month', label: 'Ce mois' },
  { id: 'last-month', label: 'Mois dernier' },
  { id: '3months', label: '3 derniers mois' },
  { id: 'custom', label: 'Personnalise' },
]

// KPI Card component
function KpiCard({ icon: Icon, label, value, trend, trendValue, color = 'violet' }) {
  const isPositive = trend === 'up'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trendValue}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

// Funnel component
function FunnelChart({ data }) {
  const maxValue = data[0]?.value || 1

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={item.stage}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{item.stage}</span>
            <span className="font-medium text-gray-900">{item.value} ({item.percent}%)</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
            {idx < data.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-gray-100 translate-x-2" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Proof() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  // Mock KPIs
  const kpis = useMemo(() => ({
    prospects: { value: 456, trend: 'up', trendValue: '+12%' },
    sent: { value: 1234, trend: 'up', trendValue: '+8%' },
    openRate: { value: '67%', trend: 'up', trendValue: '+3%' },
    replyRate: { value: '14%', trend: 'up', trendValue: '+2%' },
    meetings: { value: 24, trend: 'up', trendValue: '+6' },
    costPerLead: { value: '12€', trend: 'down', trendValue: '-15%' },
  }), [selectedPeriod])

  // ROI calculation
  const roi = useMemo(() => {
    const cost = 297 // Plan Pro
    const leads = 24
    const avgClientValue = 500
    const revenue = leads * avgClientValue * 0.2 // 20% conversion
    const roiPercent = ((revenue - cost) / cost) * 100

    return {
      cost,
      leads,
      revenue: Math.round(revenue),
      roi: Math.round(roiPercent),
      costPerLead: leads > 0 ? Math.round(cost / leads) : 0,
    }
  }, [selectedPeriod])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Proof</h1>
          <p className="text-gray-500 mt-1">Rapports de performance et ROI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard icon={Users} label="Prospects contactes" value={kpis.prospects.value} trend={kpis.prospects.trend} trendValue={kpis.prospects.trendValue} />
        <KpiCard icon={Send} label="Messages envoyes" value={kpis.sent.value} trend={kpis.sent.trend} trendValue={kpis.sent.trendValue} color="blue" />
        <KpiCard icon={Eye} label="Taux d'ouverture" value={kpis.openRate.value} trend={kpis.openRate.trend} trendValue={kpis.openRate.trendValue} color="emerald" />
        <KpiCard icon={Reply} label="Taux de reponse" value={kpis.replyRate.value} trend={kpis.replyRate.trend} trendValue={kpis.replyRate.trendValue} color="amber" />
        <KpiCard icon={Calendar} label="RDV obtenus" value={kpis.meetings.value} trend={kpis.meetings.trend} trendValue={kpis.meetings.trendValue} color="pink" />
        <KpiCard icon={DollarSign} label="Cout par lead" value={kpis.costPerLead.value} trend={kpis.costPerLead.trend} trendValue={kpis.costPerLead.trendValue} color="green" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Evolution hebdomadaire</h3>
              <p className="text-sm text-gray-500">Envois, ouvertures et reponses</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="sent" stroke="#8b5cf6" fill="url(#colorSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="opened" stroke="#22c55e" fill="url(#colorOpened)" strokeWidth={2} />
                <Area type="monotone" dataKey="replied" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Repartition par canal</h3>
              <p className="text-sm text-gray-500">Volume d'envois</p>
            </div>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Funnel de conversion</h3>
              <p className="text-sm text-gray-500">Du premier contact au RDV</p>
            </div>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <FunnelChart data={funnelData} />
        </div>

        {/* ROI Card */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6" />
            <h3 className="font-semibold">ROI Global</h3>
          </div>

          <div className="text-center mb-6">
            <p className="text-5xl font-bold">{roi.roi}%</p>
            <p className="text-violet-200 mt-1">Retour sur investissement</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-violet-200">Cout forfait</span>
              <span className="font-semibold">{roi.cost}€</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-violet-200">Leads qualifies</span>
              <span className="font-semibold">{roi.leads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-violet-200">Revenue estime</span>
              <span className="font-semibold">{roi.revenue}€</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-violet-200">Cout par lead</span>
              <span className="font-semibold">{roi.costPerLead}€</span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Benefice net estime</span>
            </div>
            <p className="text-2xl font-bold mt-1">{roi.revenue - roi.cost}€</p>
          </div>
        </div>
      </div>
    </div>
  )
}

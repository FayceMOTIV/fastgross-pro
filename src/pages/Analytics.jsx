import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Loader2,
  TrendingDown,
  TrendingUp,
  Mail,
  Smartphone,
  MessageCircle,
  Instagram,
  Mic,
  MapPin,
  Euro,
  Target,
  Users,
  Send,
  Eye,
  Reply,
  Trophy,
  Calendar,
  Clock,
  Zap,
  AlertCircle,
  ArrowRight,
  Download,
  Filter,
  Lightbulb,
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useFirestore'
import { useOrg } from '@/contexts/OrgContext'
import TrendChart from '@/components/TrendChart'

// Channel icons and styles (Light theme)
const CHANNELS = {
  email: {
    icon: Mail,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Email',
  },
  sms: {
    icon: Smartphone,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'SMS',
  },
  whatsapp: {
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'WhatsApp',
  },
  instagram_dm: {
    icon: Instagram,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    label: 'Instagram',
  },
  voicemail: {
    icon: Mic,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    label: 'Vocal',
  },
  courrier: {
    icon: MapPin,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Courrier',
  },
}

function PeriodComparisonCard({
  current,
  previous,
  label,
  format = 'number',
  icon: Icon,
  color = 'text-indigo-600',
}) {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const isPositive = diff >= 0

  const formatValue = (val) => {
    if (format === 'percent') return `${val}%`
    if (format === 'currency') return `${val.toLocaleString('fr-FR')} EUR`
    return val.toLocaleString('fr-FR')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-display font-bold text-gray-900">{formatValue(current)}</p>
      {previous > 0 && (
        <div
          className={`flex items-center gap-1 mt-2 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>
            {isPositive ? '+' : ''}
            {diff.toFixed(1)}%
          </span>
          <span className="text-gray-400">vs periode prec.</span>
        </div>
      )}
    </motion.div>
  )
}

function ChannelPerformanceCard({ channel, data }) {
  const config = CHANNELS[channel]
  if (!config) return null

  const Icon = config.icon
  const sent = data.sent || 0
  const delivered = data.delivered || 0
  const opened = data.opened || 0
  const replied = data.replied || 0
  const converted = data.converted || 0

  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
  const replyRate = opened > 0 ? Math.round((replied / opened) * 100) : 0
  const conversionRate = replied > 0 ? Math.round((converted / replied) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-5 border ${config.border}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{config.label}</h3>
            <p className="text-xs text-gray-500">{sent.toLocaleString()} envoyes</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {replyRate}% reponse
        </div>
      </div>

      {/* Funnel */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Delivres</div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${config.bg}`} style={{ width: `${deliveryRate}%` }} />
          </div>
          <div className="w-12 text-xs text-gray-600 text-right">{deliveryRate}%</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Ouverts</div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${config.bg}`} style={{ width: `${openRate}%` }} />
          </div>
          <div className="w-12 text-xs text-gray-600 text-right">{openRate}%</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Repondus</div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${replyRate}%` }} />
          </div>
          <div className="w-12 text-xs text-indigo-600 text-right font-medium">{replyRate}%</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Convertis</div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${conversionRate}%` }} />
          </div>
          <div className="w-12 text-xs text-amber-600 text-right">{conversionRate}%</div>
        </div>
      </div>
    </motion.div>
  )
}

function ROICard({ data }) {
  const totalCost = data.cost || 0
  const totalRevenue = data.revenue || 0
  const roi = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0
  const costPerLead = data.leads > 0 ? Math.round(totalCost / data.leads) : 0
  const costPerConversion = data.conversions > 0 ? Math.round(totalCost / data.conversions) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 border-brand-500/20"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Euro className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Retour sur Investissement</h3>
          <p className="text-xs text-dark-500">Analyse financiere de vos campagnes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-500 mb-1">Cout total</p>
          <p className="text-lg font-bold text-white">{totalCost.toLocaleString()} EUR</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-500 mb-1">Revenue genere</p>
          <p className="text-lg font-bold text-brand-400">{totalRevenue.toLocaleString()} EUR</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-500 mb-1">Cout/Lead</p>
          <p className="text-lg font-bold text-white">{costPerLead} EUR</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-500 mb-1">Cout/Conversion</p>
          <p className="text-lg font-bold text-white">{costPerConversion} EUR</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
        <div>
          <p className="text-sm text-dark-400">ROI Global</p>
          <p className="text-3xl font-display font-bold text-brand-400">
            {roi > 0 ? '+' : ''}
            {roi}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-dark-400">Benefice net</p>
          <p
            className={`text-xl font-bold ${totalRevenue - totalCost >= 0 ? 'text-brand-400' : 'text-red-400'}`}
          >
            {(totalRevenue - totalCost).toLocaleString()} EUR
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function SequenceFunnel({ data }) {
  const stages = [
    { key: 'enrolled', label: 'Inscrits', color: 'bg-blue-500', value: data.enrolled || 0 },
    { key: 'contacted', label: 'Contactes', color: 'bg-cyan-500', value: data.contacted || 0 },
    { key: 'opened', label: 'Ouverts', color: 'bg-emerald-500', value: data.opened || 0 },
    { key: 'replied', label: 'Repondus', color: 'bg-amber-500', value: data.replied || 0 },
    { key: 'converted', label: 'Convertis', color: 'bg-brand-500', value: data.converted || 0 },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Funnel des Sequences</h3>
          <p className="text-xs text-dark-500">Progression des prospects dans vos sequences</p>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const width = (stage.value / maxValue) * 100
          const dropRate =
            i > 0 && stages[i - 1].value > 0
              ? Math.round(((stages[i - 1].value - stage.value) / stages[i - 1].value) * 100)
              : 0

          return (
            <div key={stage.key} className="relative">
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-dark-400">{stage.label}</div>
                <div className="flex-1 h-8 bg-dark-800 rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className={`h-full ${stage.color} flex items-center justify-end pr-2`}
                  >
                    <span className="text-xs font-medium text-white">
                      {stage.value.toLocaleString()}
                    </span>
                  </motion.div>
                </div>
                {i > 0 && dropRate > 0 && (
                  <div className="w-16 text-xs text-red-400 text-right">-{dropRate}%</div>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className="ml-24 pl-4 py-1">
                  <ArrowRight className="w-4 h-4 text-dark-600" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-dark-800 flex items-center justify-between">
        <div className="text-sm text-dark-400">Taux de conversion global</div>
        <div className="text-lg font-bold text-brand-400">
          {stages[0].value > 0 ? Math.round((stages[4].value / stages[0].value) * 100) : 0}%
        </div>
      </div>
    </motion.div>
  )
}

function InsightCard({ type, title, description, metric, action }) {
  const configs = {
    success: {
      icon: Trophy,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
      border: 'border-brand-500/20',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    info: {
      icon: Lightbulb,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  }

  const config = configs[type] || configs.info
  const Icon = config.icon

  return (
    <div className={`p-4 rounded-xl ${config.bg} border ${config.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-medium ${config.color}`}>{title}</p>
            {metric && <span className="text-sm font-bold text-white">{metric}</span>}
          </div>
          <p className="text-sm text-dark-400 mt-1">{description}</p>
          {action && (
            <button
              onClick={() => {}}
              className="text-xs text-brand-400 hover:underline mt-2"
            >
              {action}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass-card p-12 text-center">
      <BarChart3 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
      <h3 className="text-lg font-display font-semibold text-dark-400">Pas encore de donnees</h3>
      <p className="text-dark-500 text-sm mt-2 max-w-md mx-auto">
        Lancez vos premieres sequences de prospection pour voir vos statistiques apparaitre ici. Les
        donnees s'accumuleront au fur et a mesure de vos campagnes.
      </p>
    </div>
  )
}

export default function Analytics() {
  const { currentOrg } = useOrg()
  const [period, setPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const { data, loading } = useAnalytics(period)

  // Mock enhanced data (would come from Firestore)
  const enhancedData = useMemo(
    () => ({
      ...data,
      roi: {
        cost: 450,
        revenue: 2800,
        leads: 85,
        conversions: 12,
      },
      channels: {
        email: { sent: 1250, delivered: 1180, opened: 590, replied: 85, converted: 12 },
        sms: { sent: 120, delivered: 115, opened: 110, replied: 28, converted: 4 },
        whatsapp: { sent: 45, delivered: 44, opened: 42, replied: 15, converted: 3 },
        instagram_dm: { sent: 30, delivered: 28, opened: 25, replied: 8, converted: 1 },
        voicemail: { sent: 15, delivered: 15, opened: 15, replied: 5, converted: 1 },
        courrier: { sent: 8, delivered: 8, opened: 8, replied: 4, converted: 1 },
      },
      funnel: {
        enrolled: 1500,
        contacted: 1468,
        opened: 789,
        replied: 145,
        converted: 22,
      },
      insights: {
        bestDay: 'Mardi',
        bestHour: '9h - 10h',
        bestChannel: 'SMS',
        bestSubject: 'Question rapide sur...',
        topSequence: 'B2B SaaS Outreach',
        improvement: '+23%',
      },
      trends: {
        daily: [
          { date: 'Lun', emails: 45, replies: 3, conversions: 0 },
          { date: 'Mar', emails: 62, replies: 8, conversions: 1 },
          { date: 'Mer', emails: 58, replies: 5, conversions: 1 },
          { date: 'Jeu', emails: 55, replies: 6, conversions: 0 },
          { date: 'Ven', emails: 48, replies: 4, conversions: 1 },
          { date: 'Sam', emails: 12, replies: 1, conversions: 0 },
          { date: 'Dim', emails: 8, replies: 0, conversions: 0 },
        ],
      },
    }),
    [data]
  )

  const hasData = data.totals.emailsSent > 0 || data.byClient.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'channels', label: 'Par canal', icon: Zap },
    { id: 'roi', label: 'ROI', icon: Euro },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            Analytics
          </h1>
          <p className="text-dark-400 mt-1">Vue detaillee de vos performances multicanales</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 p-1 bg-dark-800/50 rounded-lg border border-dark-700">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === p ? 'bg-brand-500/20 text-brand-400' : 'text-dark-400 hover:text-white'
                }`}
              >
                {p === '7d' ? '7j' : p === '30d' ? '30j' : '90j'}
              </button>
            ))}
          </div>
          {/* Export button */}
          <button className="btn-ghost flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                  : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <PeriodComparisonCard
                  current={data.totals.emailsSent}
                  previous={data.totals.previousEmailsSent}
                  label="Messages envoyes"
                  icon={Send}
                  color="text-blue-400"
                />
                <PeriodComparisonCard
                  current={data.totals.openRate}
                  previous={data.totals.previousOpenRate}
                  label="Taux d'ouverture"
                  format="percent"
                  icon={Eye}
                  color="text-emerald-400"
                />
                <PeriodComparisonCard
                  current={data.totals.replyRate}
                  previous={data.totals.previousReplyRate}
                  label="Taux de reponse"
                  format="percent"
                  icon={Reply}
                  color="text-amber-400"
                />
                <PeriodComparisonCard
                  current={enhancedData.funnel.converted}
                  previous={15}
                  label="Conversions"
                  icon={Trophy}
                  color="text-brand-400"
                />
              </div>

              {/* Charts */}
              {data.chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TrendChart
                    data={data.chartData}
                    dataKey="emails"
                    color="#00d49a"
                    title="Messages envoyes"
                    height={220}
                  />
                  <TrendChart
                    data={data.chartData}
                    dataKey="replies"
                    color="#fbbf24"
                    title="Reponses recues"
                    height={220}
                  />
                </div>
              )}

              {/* Funnel */}
              <SequenceFunnel data={enhancedData.funnel} />

              {/* Quick insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InsightCard
                  type="success"
                  title="Meilleur jour"
                  description={`${enhancedData.insights.bestDay} genere le plus de reponses`}
                  metric="+23%"
                />
                <InsightCard
                  type="info"
                  title="Meilleure heure"
                  description={`Envoyez vos messages entre ${enhancedData.insights.bestHour}`}
                  metric="9h-10h"
                />
                <InsightCard
                  type="success"
                  title="Canal star"
                  description={`Le ${enhancedData.insights.bestChannel} a le meilleur taux de reponse`}
                  metric="23%"
                />
                <InsightCard
                  type="warning"
                  title="A ameliorer"
                  description="Instagram DM necessite plus d'attention"
                  action="Voir les recommandations"
                />
              </div>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(enhancedData.channels).map(([channel, channelData]) => (
                  <ChannelPerformanceCard key={channel} channel={channel} data={channelData} />
                ))}
              </div>

              {/* Channel comparison table */}
              <div className="glass-card p-6">
                <h3 className="font-medium text-white mb-4">Comparaison des canaux</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-800">
                        <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Canal
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Envoyes
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Ouverture
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Reponse
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Conversion
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                          Cout/Conv.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800/50">
                      {Object.entries(enhancedData.channels).map(([channel, d]) => {
                        const config = CHANNELS[channel]
                        if (!config) return null
                        const Icon = config.icon
                        const openRate =
                          d.delivered > 0 ? Math.round((d.opened / d.delivered) * 100) : 0
                        const replyRate =
                          d.opened > 0 ? Math.round((d.replied / d.opened) * 100) : 0
                        const convRate =
                          d.replied > 0 ? Math.round((d.converted / d.replied) * 100) : 0

                        return (
                          <tr key={channel} className="hover:bg-dark-800/30">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <span className="text-sm font-medium text-white">
                                  {config.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-dark-300 text-right">{d.sent}</td>
                            <td className="px-4 py-4 text-sm text-right">
                              <span className={openRate >= 50 ? 'text-brand-400' : 'text-dark-400'}>
                                {openRate}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-right">
                              <span
                                className={replyRate >= 15 ? 'text-brand-400' : 'text-dark-400'}
                              >
                                {replyRate}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-right">
                              <span className={convRate >= 10 ? 'text-brand-400' : 'text-dark-400'}>
                                {convRate}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-dark-300 text-right">
                              {d.converted > 0 ? Math.round(50 / d.converted) : '-'} EUR
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ROI Tab */}
          {activeTab === 'roi' && (
            <div className="space-y-6">
              <ROICard data={enhancedData.roi} />

              {/* Cost breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="font-medium text-white mb-4">Repartition des couts</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Emails (Amazon SES)', cost: 12, color: 'bg-orange-500' },
                      { label: 'Cold Outreach (Saleshandy)', cost: 25, color: 'bg-blue-500' },
                      { label: 'SMS (BudgetSMS)', cost: 45, color: 'bg-cyan-500' },
                      { label: 'WhatsApp (Evolution API)', cost: 0, color: 'bg-green-500' },
                      { label: 'Courrier (Merci Facteur)', cost: 18, color: 'bg-amber-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-32 text-sm text-dark-400">{item.label}</div>
                        <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color}`}
                            style={{ width: `${(item.cost / 450) * 100}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-dark-300 text-right">{item.cost} EUR</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-medium text-white mb-4">Revenue par source</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Clients directs', revenue: 1800, color: 'bg-brand-500' },
                      { label: 'Upsells', revenue: 650, color: 'bg-purple-500' },
                      { label: 'Referrals', revenue: 350, color: 'bg-cyan-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-32 text-sm text-dark-400">{item.label}</div>
                        <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color}`}
                            style={{ width: `${(item.revenue / 2800) * 100}%` }}
                          />
                        </div>
                        <div className="w-20 text-sm text-dark-300 text-right">
                          {item.revenue} EUR
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LTV/CAC */}
              <div className="glass-card p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-1">CAC (Cout d'acquisition)</p>
                    <p className="text-2xl font-bold text-white">37.50 EUR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-1">LTV (Valeur client)</p>
                    <p className="text-2xl font-bold text-brand-400">233 EUR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-1">Ratio LTV/CAC</p>
                    <p className="text-2xl font-bold text-brand-400">6.2x</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-1">Payback period</p>
                    <p className="text-2xl font-bold text-white">1.2 mois</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsightCard
                  type="success"
                  title="Meilleur jour d'envoi"
                  description={`Le ${enhancedData.insights.bestDay} genere 23% de reponses en plus que la moyenne. Privilegiez ce jour pour vos campagnes importantes.`}
                  metric="+23%"
                />
                <InsightCard
                  type="success"
                  title="Creneau optimal"
                  description={`Les messages envoyes entre ${enhancedData.insights.bestHour} ont le meilleur taux d'ouverture. C'est le moment ou vos prospects sont les plus receptifs.`}
                  metric="68% ouv."
                />
                <InsightCard
                  type="info"
                  title="Objet le plus performant"
                  description={`"${enhancedData.insights.bestSubject}" obtient les meilleurs resultats. Les objets courts et personnalises fonctionnent mieux.`}
                  metric="68%"
                />
                <InsightCard
                  type="success"
                  title="Sequence star"
                  description={`La sequence "${enhancedData.insights.topSequence}" a le meilleur taux de conversion. Analysez son contenu pour l'appliquer ailleurs.`}
                  metric="16%"
                />
                <InsightCard
                  type="warning"
                  title="Canal a optimiser"
                  description="Instagram DM a un taux de reponse inferieur a la moyenne. Revoyez votre approche ou reduisez son utilisation."
                  action="Voir les templates Instagram"
                />
                <InsightCard
                  type="info"
                  title="Multicanal efficace"
                  description="Les prospects contactes sur 3+ canaux convertissent 2.5x plus. Continuez a diversifier vos points de contact."
                  metric="2.5x"
                />
              </div>

              {/* Recommendations */}
              <div className="glass-card p-6">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Recommandations IA
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Augmentez l'utilisation du SMS</p>
                        <p className="text-sm text-dark-400 mt-1">
                          Avec 23% de taux de reponse, le SMS est votre canal le plus performant
                          mais represente seulement 8% de vos envois. Doublez son utilisation pour
                          maximiser vos conversions.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Optimisez vos objets d'email</p>
                        <p className="text-sm text-dark-400 mt-1">
                          Les objets contenant une question ont 34% d'ouverture en plus. Testez des
                          formulations comme "Question rapide sur [sujet]" ou "Avez-vous 2 minutes
                          ?"
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Ajoutez une etape vocale</p>
                        <p className="text-sm text-dark-400 mt-1">
                          Les sequences avec message vocal en etape 4 ont 18% de conversions en
                          plus. Ajoutez un voicemail personnalise apres vos emails.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance by client (always shown at bottom) */}
          {data.byClient.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="section-title mb-4">Performance par client</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                        Client
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                        Envoyes
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                        Taux ouv.
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                        Taux rep.
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/30">
                    {data.byClient.map((client, i) => (
                      <tr key={i} className="hover:bg-dark-800/30">
                        <td className="px-4 py-4 text-sm font-medium text-white">{client.name}</td>
                        <td className="px-4 py-4 text-sm text-dark-300 text-center">
                          {client.sent}
                        </td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={client.openRate >= 55 ? 'text-brand-400' : 'text-dark-300'}
                          >
                            {client.openRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={client.replyRate >= 12 ? 'text-brand-400' : 'text-dark-300'}
                          >
                            {client.replyRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="w-full bg-dark-800 rounded-full h-2 max-w-[100px] mx-auto">
                            <div
                              className="bg-brand-500 h-2 rounded-full"
                              style={{ width: `${Math.min(client.replyRate * 5, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

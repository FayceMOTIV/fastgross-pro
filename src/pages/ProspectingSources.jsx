/**
 * Prospecting Sources Dashboard — 4 tabs
 * Tab 1: Vue globale (KPIs + graphique)
 * Tab 2: Sources (cartes par source avec toggle, trigger, config)
 * Tab 3: Pipeline (funnel + logs)
 * Tab 4: Configuration
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart3, Database, Settings, Zap, RefreshCw,
  TrendingUp, Users, Target, DollarSign
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useProspectingSources } from '@/hooks/useProspectingSources'
import SourceCard from '@/components/prospecting/SourceCard'
import PipelineStats from '@/components/prospecting/PipelineStats'
import SourceConfigModal from '@/components/prospecting/SourceConfigModal'
import SourceGroupTabs from '@/components/prospecting/SourceGroupTabs'

const TABS = [
  { key: 'overview', label: 'Vue globale', icon: BarChart3 },
  { key: 'sources', label: 'Sources', icon: Database },
  { key: 'pipeline', label: 'Pipeline', icon: Zap },
  { key: 'config', label: 'Configuration', icon: Settings },
]

export default function ProspectingSources() {
  const {
    stats, health, config,
    loading, error,
    triggerSource, triggerPipeline, saveConfig, refresh,
  } = useProspectingSources()

  const [activeTab, setActiveTab] = useState('overview')
  const [activeGroup, setActiveGroup] = useState('all')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(null)

  const handleTriggerSource = async (sourceId) => {
    setTriggerLoading(sourceId)
    try {
      await triggerSource(sourceId)
      toast.success(`Source ${sourceId} lancee`)
    } catch (err) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setTriggerLoading(null)
    }
  }

  const handleTriggerPipeline = async () => {
    setTriggerLoading('pipeline')
    try {
      await triggerPipeline()
      toast.success('Pipeline lance')
    } catch (err) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setTriggerLoading(null)
    }
  }

  const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n || 0)
  }

  const kpis = stats?.kpis || {}

  // Filter sources by group
  const filteredSources = Object.entries(stats?.sourceBreakdown || {}).filter(([sid, s]) => {
    if (activeGroup === 'all') return true
    return s.group === activeGroup
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sources IA</h1>
          <p className="text-gray-500">Agregation multi-source automatisee</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Leads collectes"
              value={formatNumber(kpis.totalCollected)}
              subtitle="30 derniers jours"
              icon={TrendingUp}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <KpiCard
              label="Leads promus"
              value={formatNumber(kpis.totalPromoted)}
              subtitle="Vers prospects"
              icon={Users}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <KpiCard
              label="Taux de conversion"
              value={`${kpis.conversionRate || 0}%`}
              subtitle="Collecte → Promotion"
              icon={Target}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
            />
            <KpiCard
              label="Cout par lead"
              value={`${kpis.estimatedCostPerLead || '0.00'} EUR`}
              subtitle={`${kpis.activeSources || 0} sources actives`}
              icon={DollarSign}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            />
          </div>

          {/* Chart */}
          {stats?.dailyTotals?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Evolution quotidienne</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dailyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                  />
                  <Legend />
                  <Bar dataKey="collected" name="Collectes" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="promoted" name="Promus" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Group totals */}
          {stats?.groupTotals && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stats.groupTotals).map(([group, data]) => (
                <div key={group} className="card p-4">
                  <h4 className="font-medium text-gray-700 capitalize mb-2">
                    {group === 'registries' ? 'Registres Publics' : 'Signaux d\'Intention'}
                  </h4>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(data.collected)}</p>
                      <p className="text-xs text-gray-500">Collectes</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">{formatNumber(data.promoted)}</p>
                      <p className="text-xs text-gray-500">Promus</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">{data.sources}</p>
                      <p className="text-xs text-gray-500">Sources</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SourceGroupTabs activeGroup={activeGroup} onGroupChange={setActiveGroup} />
            <span className="text-sm text-gray-500">{filteredSources.length} sources</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map(([sourceId, sourceStats]) => (
              <SourceCard
                key={sourceId}
                sourceId={sourceId}
                stats={sourceStats}
                healthData={health?.[sourceId]}
                onTrigger={handleTriggerSource}
                loading={triggerLoading === sourceId}
              />
            ))}
          </div>

          {filteredSources.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucune source dans ce groupe
            </div>
          )}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <PipelineStats
          funnel={stats?.funnel}
          onRunPipeline={handleTriggerPipeline}
          loading={triggerLoading === 'pipeline'}
        />
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Configuration globale</h3>
              <button
                onClick={() => setShowConfigModal(true)}
                className="btn-primary text-sm"
              >
                Modifier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigItem label="Collecte automatique" value={config?.enabled ? 'Active' : 'Desactive'} />
              <ConfigItem label="Score minimum" value={`${config?.scoring?.minScoreToPromote || 40}/100`} />
              <ConfigItem label="Max leads/jour" value={formatNumber(config?.limits?.maxRawLeadsPerDay || 5000)} />
              <ConfigItem label="Max promotions/jour" value={formatNumber(config?.limits?.maxPromotionsPerDay || 500)} />
              <ConfigItem label="TTL rawLeads" value={`${config?.limits?.rawLeadTTLDays || 30} jours`} />
              <ConfigItem label="Dedup floue" value={config?.dedup?.enableFuzzyCompanyMatch ? 'Active' : 'Desactive'} />
            </div>
          </div>

          {/* Per-source status */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cles API requises</h3>
            <div className="space-y-2">
              {Object.entries(health || {}).map(([sourceId, h]) => (
                <div key={sourceId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{sourceId}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    h.hasApiKey ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {h.hasApiKey ? 'Configuree' : 'Manquante'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <SourceConfigModal
          config={config}
          onSave={saveConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  )
}

// ─── SUB COMPONENTS ─────────────────────────────────────────────────────────

function KpiCard({ label, value, subtitle, icon: Icon, color, bgColor }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}

function ConfigItem({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

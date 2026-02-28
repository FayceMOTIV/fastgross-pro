/**
 * WarRoom — Admin-only, 4 tabs: vue globale, orgs, replies, controles
 */

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Shield,
  RefreshCw,
  Activity,
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
  Zap,
} from 'lucide-react'
import useWarRoom from '../hooks/useWarRoom'
import ChannelStatsBar from '../components/warroom/ChannelStatsBar'
import OrgTable from '../components/warroom/OrgTable'
import LiveReplyFeed from '../components/warroom/LiveReplyFeed'
import WarRoomCharts from '../components/warroom/WarRoomCharts'
import EmergencyControls from '../components/warroom/EmergencyControls'

// Generate mock chart data
function generateMockVolumeData() {
  const days = []
  const channels = ['email', 'sms', 'whatsapp', 'instagram', 'linkedin']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const entry = { date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }
    channels.forEach((ch) => {
      entry[ch] = Math.floor(Math.random() * 100) + 10
    })
    days.push(entry)
  }
  return days
}

function generateMockPerformanceData() {
  const days = []
  const channels = ['email', 'sms', 'whatsapp', 'instagram', 'linkedin']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const entry = { date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }
    channels.forEach((ch) => {
      entry[ch] = Math.round(Math.random() * 15 + 2)
    })
    days.push(entry)
  }
  return days
}

function generateMockDistributionData(channelStats) {
  if (!channelStats || !Array.isArray(channelStats)) return []
  return channelStats
    .filter((ch) => (ch.sentToday || 0) > 0)
    .map((ch) => ({ name: ch.channel, value: ch.sentToday || 0 }))
}

function generateMockTrendData() {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      value: Math.floor(Math.random() * 300) + 100,
    })
  }
  return days
}

export default function WarRoom() {
  const {
    stats,
    orgList,
    replyFeed,
    loading,
    isGlobalPaused,
    refreshStats,
    toggleProspection,
    emergencyPauseAll,
    emergencyResumeAll,
    pauseChannel,
    resumeChannel,
  } = useWarRoom()

  const [activeTab, setActiveTab] = useState('overview')

  const channelStats = stats.channels || []
  const totalSentToday = channelStats.reduce((sum, ch) => sum + (ch.sentToday || 0), 0)
  const totalErrors = channelStats.reduce((sum, ch) => sum + (ch.errors || 0), 0)
  const healthyChannels = channelStats.filter((ch) => ch.health === 'healthy').length
  const avgReplyRate =
    channelStats.length > 0
      ? Math.round(
          channelStats.reduce((sum, ch) => sum + (ch.replyRate || 0), 0) / channelStats.length
        )
      : 0

  const activeAlerts = useMemo(() => {
    const alerts = []
    channelStats.forEach((ch) => {
      if (ch.health === 'down') {
        alerts.push({
          id: `down-${ch.channel}`,
          severity: 'critical',
          title: `${ch.channel} est down`,
          message: ch.errorMessage || 'Canal indisponible',
          channel: ch.channel,
        })
      }
      if (ch.health === 'degraded') {
        alerts.push({
          id: `degraded-${ch.channel}`,
          severity: 'warning',
          title: `${ch.channel} degrade`,
          message: `${ch.errors || 0} erreurs detectees`,
          channel: ch.channel,
        })
      }
    })
    return alerts
  }, [channelStats])

  const channelStatusMap = useMemo(() => {
    const map = {}
    channelStats.forEach((ch) => {
      map[ch.channel] = ch.paused ? 'paused' : 'active'
    })
    return map
  }, [channelStats])

  const handleToggleProspection = async (orgId, enable) => {
    try {
      await toggleProspection(orgId, enable)
      toast.success(enable ? 'Prospection activee' : 'Prospection mise en pause')
    } catch (err) {
      toast.error(err.message || 'Erreur')
    }
  }

  const handleEmergencyPause = async () => {
    try {
      await emergencyPauseAll()
      toast.success('PAUSE GLOBALE activee')
    } catch (err) {
      toast.error(err.message || 'Erreur pause globale')
    }
  }

  const handleEmergencyResume = async () => {
    try {
      await emergencyResumeAll()
      toast.success('Prospection reprise')
    } catch (err) {
      toast.error(err.message || 'Erreur reprise')
    }
  }

  const handlePauseChannel = async (channel) => {
    try {
      await pauseChannel(channel)
      toast.success(`${channel} mis en pause`)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    }
  }

  const handleResumeChannel = async (channel) => {
    try {
      await resumeChannel(channel)
      toast.success(`${channel} repris`)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    }
  }

  // Chart data
  const volumeData = useMemo(() => generateMockVolumeData(), [])
  const performanceData = useMemo(() => generateMockPerformanceData(), [])
  const distributionData = useMemo(() => generateMockDistributionData(channelStats), [channelStats])
  const trendData = useMemo(() => generateMockTrendData(), [])

  const tabs = [
    { id: 'overview', label: 'Vue globale' },
    { id: 'orgs', label: 'Organisations', count: orgList.length },
    { id: 'replies', label: 'Replies live', count: replyFeed.length },
    { id: 'controls', label: 'Controles', alert: totalErrors > 0 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600" />
              War Room
              {isGlobalPaused && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  PAUSE GLOBALE
                </span>
              )}
            </h1>
            <p className="text-gray-500 mt-1">
              Supervision prospection cross-organisation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Top-level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalSentToday}</p>
            <p className="text-sm text-gray-500">Envoyes aujourd'hui</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgReplyRate}%</p>
            <p className="text-sm text-gray-500">Taux reponse moyen</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{orgList.length}</p>
            <p className="text-sm text-gray-500">Organisations</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${healthyChannels === channelStats.length ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <Activity className={`w-6 h-6 ${healthyChannels === channelStats.length ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {healthyChannels}/{channelStats.length}
            </p>
            <p className="text-sm text-gray-500">Canaux healthy</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalErrors > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <AlertTriangle className={`w-6 h-6 ${totalErrors > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalErrors}</p>
            <p className="text-sm text-gray-500">Erreurs</p>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Buttons */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {tab.count}
                    </span>
                  )}
                  {tab.alert && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* ========== OVERVIEW TAB ========== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Channel stats bars */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Canaux</h2>
                  <div className="space-y-2">
                    {channelStats.map((ch) => (
                      <ChannelStatsBar
                        key={ch.channel}
                        channel={ch.channel}
                        stats={ch}
                      />
                    ))}
                    {channelStats.length === 0 && (
                      <div className="text-center py-8 text-sm text-gray-500">
                        Aucune donnee canal disponible
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytiques</h2>
                  <WarRoomCharts
                    volumeData={volumeData}
                    performanceData={performanceData}
                    distributionData={distributionData}
                    trendData={trendData}
                  />
                </div>
              </div>
            )}

            {/* ========== ORGS TAB ========== */}
            {activeTab === 'orgs' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Organisations</h2>
                <OrgTable
                  orgs={orgList}
                  onToggleProspection={handleToggleProspection}
                />
              </div>
            )}

            {/* ========== REPLIES TAB ========== */}
            {activeTab === 'replies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Replies en temps reel
                    {replyFeed.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {replyFeed.length} recentes
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Temps reel
                  </div>
                </div>
                <LiveReplyFeed replies={replyFeed} maxItems={30} />
              </div>
            )}

            {/* ========== CONTROLS TAB ========== */}
            {activeTab === 'controls' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Controles d'urgence
                </h2>
                <EmergencyControls
                  isGlobalPaused={isGlobalPaused}
                  channelStatuses={channelStatusMap}
                  activeAlerts={activeAlerts}
                  onEmergencyPause={handleEmergencyPause}
                  onEmergencyResume={handleEmergencyResume}
                  onPauseChannel={handlePauseChannel}
                  onResumeChannel={handleResumeChannel}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

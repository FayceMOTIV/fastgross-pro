/**
 * Monitoring Dashboard
 * Real-time view of all AI, Enrichment, and Posting systems
 */

import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  RefreshCw,
  Activity,
  Zap,
  Mail,
  Send,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MonitoringDashboard() {
  const [aiStatus, setAiStatus] = useState(null)
  const [enrichmentStatus, setEnrichmentStatus] = useState(null)
  const [postingStatus, setPostingStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    loadAllStatus()
    if (autoRefresh) {
      const interval = setInterval(loadAllStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAllStatus = async () => {
    setLoading(true)
    try {
      const [aiResult, enrichmentResult, postingResult] = await Promise.all([
        httpsCallable(functions, 'getAIStatus')().catch(() => ({ data: null })),
        httpsCallable(functions, 'getEnrichmentStatus')().catch(() => ({ data: null })),
        httpsCallable(functions, 'getPostingStatus')().catch(() => ({ data: null }))
      ])

      setAiStatus(aiResult.data)
      setEnrichmentStatus(enrichmentResult.data)
      setPostingStatus(postingResult.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error loading status:', error)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const aiProviderData = aiStatus?.providers
    ? Object.entries(aiStatus.providers).map(([name, status]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        usage: status.usage || 0,
        limit: status.limit || 0,
        percentage: status.limit ? Math.round((status.usage / status.limit) * 100) : 0
      }))
    : []

  const aiLatencyData = aiStatus?.stats?.averageLatency
    ? Object.entries(aiStatus.stats.averageLatency).map(([name, latency]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        latency: latency || 0
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-500" />
            Monitoring Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Vue temps reel de tous les systemes</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Mis a jour {formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true })}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              autoRefresh
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>
          <button
            onClick={loadAllStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !aiStatus ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AI System */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">AI System</h3>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Requetes totales</span>
                  <span className="font-bold">{aiStatus?.stats?.totalRequests || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taux de succes</span>
                  <span className="font-bold text-green-600">
                    {aiStatus?.stats?.successRate || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Providers actifs</span>
                  <span className="font-bold">
                    {aiStatus?.providers
                      ? Object.values(aiStatus.providers).filter((p) => p.available).length
                      : 0}
                    /3
                  </span>
                </div>
              </div>
            </div>

            {/* Enrichment System */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Enrichment</h3>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Emails enrichis</span>
                  <span className="font-bold">
                    {enrichmentStatus?.stats?.successfulRequests || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taux de succes</span>
                  <span className="font-bold text-green-600">
                    {enrichmentStatus?.stats?.successRate || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacite restante</span>
                  <span className="font-bold">
                    {enrichmentStatus?.stats?.remainingCapacity || 310}
                  </span>
                </div>
              </div>
            </div>

            {/* Posting System */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Send className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Posting</h3>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Posts crees</span>
                  <span className="font-bold">{postingStatus?.stats?.totalPosts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taux de succes</span>
                  <span className="font-bold text-green-600">
                    {postingStatus?.stats?.successRate || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plateformes</span>
                  <span className="font-bold text-pink-600">13</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Provider Usage */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Usage des Providers AI
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aiProviderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="usage" fill="#3B82F6" name="Utilise" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="limit" fill="#E5E7EB" name="Limite" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Latency Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Latence moyenne (ms)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aiLatencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="latency" fill="#8B5CF6" name="Latence" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Analyse des couts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Cout actuel</p>
                    <p className="text-3xl font-bold text-green-600">24 EUR</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Prix marche</p>
                    <p className="text-3xl font-bold text-gray-400 line-through">423 EUR</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Economie</span>
                    <span className="font-bold text-green-600">399 EUR/mois</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{ width: '94%' }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600">
                    <span className="font-bold text-green-600">94%</span> d'economie
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Capacites mensuelles</h4>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">AI Generation</span>
                  </div>
                  <span className="font-bold text-blue-600">492K FREE</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Email Enrichment</span>
                  </div>
                  <span className="font-bold text-purple-600">310 FREE</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-pink-600" />
                    <span className="text-sm text-gray-700">Multi-Platform Posts</span>
                  </div>
                  <span className="font-bold text-pink-600">UNLIMITED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Details des Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiStatus?.providers &&
                Object.entries(aiStatus.providers).map(([name, provider]) => (
                  <div
                    key={name}
                    className={`p-4 rounded-lg border ${
                      provider.available
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{name}</span>
                      {provider.available ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usage</span>
                        <span>
                          {provider.usage || 0} / {provider.limit || 0}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (provider.usage / provider.limit) * 100 > 80
                              ? 'bg-red-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((provider.usage / provider.limit) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priorite</span>
                        <span>{provider.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

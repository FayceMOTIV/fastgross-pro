/**
 * Provider Status Component
 * Shows status of all AI providers with usage stats
 */

import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Zap,
  Cloud,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

const PROVIDER_CONFIG = {
  groq: {
    name: 'Groq',
    icon: Zap,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    description: 'Ultra-rapide (300 tok/sec)',
    dailyLimit: 14400
  },
  openrouter: {
    name: 'OpenRouter',
    icon: Cloud,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    description: '4 modeles en rotation',
    dailyLimit: 1000
  },
  gemini: {
    name: 'Gemini',
    icon: Sparkles,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    description: 'Backup (1M context)',
    dailyLimit: 1000
  }
}

export default function ProviderStatus() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const fetchStatus = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true)
      else setLoading(true)

      const getAIStatus = httpsCallable(functions, 'getAIStatus')
      const result = await getAIStatus()

      if (result.data.success) {
        setData(result.data)
        setError(null)
        if (showToast) toast.success('Statut mis a jour')
      } else {
        throw new Error('Failed to fetch status')
      }
    } catch (err) {
      console.error('Error fetching AI status:', err)
      setError(err.message)
      if (showToast) toast.error('Erreur lors du rafraichissement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-gray-600">Chargement des providers...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8 text-red-500">
          <XCircle className="w-6 h-6 mr-2" />
          <span>Erreur: {error}</span>
        </div>
      </div>
    )
  }

  const { providers, stats } = data || {}

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Providers IA</h3>
          <p className="text-sm text-gray-500">Statut en temps reel</p>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraichir
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(PROVIDER_CONFIG).map(([key, config]) => {
          const provider = providers?.[key] || {}
          const Icon = config.icon
          const usagePercent = provider.limit
            ? Math.round((provider.usage / provider.limit) * 100)
            : 0

          return (
            <div
              key={key}
              className={`p-4 rounded-xl border ${config.border} ${config.bg} bg-opacity-50`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{config.name}</h4>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
                {provider.available ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* Usage bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Usage</span>
                  <span>
                    {provider.usage || 0} / {provider.limit || config.dailyLimit}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent > 80
                        ? 'bg-red-500'
                        : usagePercent > 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Statistiques globales</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalRequests || 0}</p>
              <p className="text-xs text-gray-500">Total requetes</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.successRate || 0}%</p>
              <p className="text-xs text-gray-500">Taux de succes</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-gray-900">
                {stats.providerUsage?.groq || 0}
              </p>
              <p className="text-xs text-gray-500">Via Groq</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageLatency?.groq || 0}ms
              </p>
              <p className="text-xs text-gray-500">Latence Groq</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

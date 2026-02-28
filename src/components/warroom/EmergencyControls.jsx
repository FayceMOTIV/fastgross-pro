/**
 * EmergencyControls — Boutons pause urgence + alertes
 */

import { useState } from 'react'
import {
  ShieldAlert,
  Pause,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

export default function EmergencyControls({
  isGlobalPaused,
  channelStatuses = {},
  activeAlerts = [],
  onEmergencyPause,
  onEmergencyResume,
  onPauseChannel,
  onResumeChannel,
}) {
  const [globalLoading, setGlobalLoading] = useState(false)
  const [channelLoading, setChannelLoading] = useState(null)

  const handleGlobalToggle = async () => {
    setGlobalLoading(true)
    try {
      if (isGlobalPaused) {
        await onEmergencyResume?.()
      } else {
        await onEmergencyPause?.()
      }
    } finally {
      setGlobalLoading(false)
    }
  }

  const handleChannelToggle = async (channel, isPaused) => {
    setChannelLoading(channel)
    try {
      if (isPaused) {
        await onResumeChannel?.(channel)
      } else {
        await onPauseChannel?.(channel)
      }
    } finally {
      setChannelLoading(null)
    }
  }

  const channels = Object.entries(channelStatuses)

  return (
    <div className="space-y-4">
      {/* Global emergency */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Controle d'urgence</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isGlobalPaused
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isGlobalPaused ? 'bg-red-500' : 'bg-green-500'
              }`}
            />
            {isGlobalPaused ? 'PAUSE GLOBALE' : 'Systeme actif'}
          </span>
        </div>

        <button
          onClick={handleGlobalToggle}
          disabled={globalLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
            isGlobalPaused
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {globalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isGlobalPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
          {isGlobalPaused ? 'Reprendre toute la prospection' : 'PAUSE URGENCE — Tout arreter'}
        </button>
      </div>

      {/* Per-channel controls */}
      {channels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Controle par canal</h3>
          <div className="space-y-2">
            {channels.map(([channel, status]) => {
              const isPaused = status === 'paused'
              const isLoading = channelLoading === channel
              return (
                <div
                  key={channel}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPaused ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {channel}
                    </span>
                    <span className="text-xs text-gray-500">
                      {isPaused ? 'En pause' : 'Actif'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleChannelToggle(channel, isPaused)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                      isPaused
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPaused ? (
                      <Play className="w-3 h-3" />
                    ) : (
                      <Pause className="w-3 h-3" />
                    )}
                    {isPaused ? 'Reprendre' : 'Pause'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Alertes actives</h3>
          <div className="space-y-2">
            {activeAlerts.map((alert, i) => (
              <div
                key={alert.id || i}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border border-red-200'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                {alert.severity === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                  )}
                  {alert.channel && (
                    <span className="text-xs text-gray-500 capitalize">{alert.channel}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

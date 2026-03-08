import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getFunctions, httpsCallable } from 'firebase/functions'

const KPICard = ({ label, value, sub, color, icon }) => (
  <div className={`bg-white rounded-2xl border-2 ${color} p-5 shadow-sm`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
    <div className="text-3xl font-black text-gray-900">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
)

export default function ROIDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [period])

  async function loadMetrics() {
    setLoading(true)
    try {
      const fn = httpsCallable(getFunctions(), 'getROIMetrics')
      const res = await fn({ periodDays: period })
      setMetrics(res.data.metrics)
    } catch (err) {
      console.error('ROI metrics error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const ov = metrics?.overview || {}

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Tableau de bord ROI</h1>
          <p className="text-gray-500 text-sm mt-1">Votre retour sur investissement FMF en temps reel</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                period === d ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* ROI Banner */}
      {ov.roi > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Retour sur investissement</p>
              <p className="text-5xl font-black mt-1">x{ov.roi}</p>
              <p className="text-green-100 text-sm mt-2">
                {ov.pipelineValue?.toLocaleString('fr-FR')} EUR de pipeline genere pour {ov.fmfCost} EUR/mois
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Prospects contactes" value={ov.totalContacted || 0} sub={`${period} derniers jours`} color="border-blue-200" icon="M" />
        <KPICard label="Taux de reponse" value={`${ov.replyRate || 0}%`} sub={`${ov.replied || 0} reponses`} color="border-purple-200" icon="C" />
        <KPICard label="Leads interesses" value={ov.interested || 0} sub={`Conv. ${ov.conversionRate || 0}%`} color="border-orange-200" icon="T" />
        <KPICard label="Pipeline estime" value={`${(ov.pipelineValue || 0).toLocaleString('fr-FR')} EUR`} sub="Valeur totale" color="border-green-200" icon="V" />
      </div>

      {/* Canal breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-4">Performances par canal</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'whatsapp', label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
            { key: 'email', label: 'Email', color: 'bg-blue-100 text-blue-700' },
            { key: 'sms', label: 'SMS', color: 'bg-purple-100 text-purple-700' },
            { key: 'voice', label: 'Appels IA', color: 'bg-orange-100 text-orange-700' }
          ].map(c => (
            <div key={c.key} className={`rounded-xl p-4 ${c.color}`}>
              <div className="text-2xl font-black">{metrics?.channels?.[c.key] || 0}</div>
              <div className="text-sm font-medium">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique jour de la semaine */}
      {metrics?.timing?.byDayOfWeek?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Meilleurs jours de contact</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.timing.byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="sent" name="Envoyes" fill="#3B82F6" radius={4} />
              <Bar dataKey="replied" name="Reponses" fill="#10B981" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top sources */}
      {metrics?.topSources?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Sources les plus performantes</h2>
          <div className="space-y-3">
            {metrics.topSources.map((src, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-gray-300">#{i + 1}</span>
                  <span className="text-sm font-medium text-gray-700">{src.source}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((src.count / (metrics.topSources[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-600 w-8 text-right">{src.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {metrics?.insights?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Insights Alex</h2>
          {metrics.insights.map((insight, i) => {
            const colors = {
              success: 'bg-green-50 border-green-200 text-green-800',
              warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              action: 'bg-blue-50 border-blue-200 text-blue-800',
              info: 'bg-gray-50 border-gray-200 text-gray-700'
            }
            return (
              <div key={i} className={`rounded-xl border p-4 text-sm font-medium ${colors[insight.type] || colors.info}`}>
                {insight.msg}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

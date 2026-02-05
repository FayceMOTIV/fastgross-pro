import { useState } from 'react'
import { BarChart3, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { useAnalytics } from '@/hooks/useFirestore'
import TrendChart from '@/components/TrendChart'

function PeriodComparisonCard({ current, previous, label, format = 'number' }) {
  const diff = previous > 0 ? ((current - previous) / previous * 100) : 0
  const isPositive = diff >= 0
  const displayValue = format === 'percent' ? `${current}%` : current

  return (
    <div className="glass-card p-5">
      <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{displayValue}</p>
      {previous > 0 && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${isPositive ? 'text-brand-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{diff.toFixed(1)}%</span>
          <span className="text-dark-500">vs période préc.</span>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass-card p-12 text-center">
      <BarChart3 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
      <h3 className="text-lg font-display font-semibold text-dark-400">
        Pas encore de données
      </h3>
      <p className="text-dark-500 text-sm mt-2 max-w-md mx-auto">
        Lancez vos premières campagnes email pour voir vos statistiques apparaître ici.
        Commencez par analyser un client avec le Scanner, puis créez une séquence avec le Forgeur.
      </p>
    </div>
  )
}

export default function Analytics() {
  const [period, setPeriod] = useState('30d')
  const { data, loading } = useAnalytics(period)

  const hasData = data.totals.emailsSent > 0 || data.byClient.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            Analytics
          </h1>
          <p className="text-dark-400 mt-1">Vue détaillée de vos performances</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                  : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
              }`}
            >
              {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Period comparison */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PeriodComparisonCard
              current={data.totals.emailsSent}
              previous={data.totals.previousEmailsSent}
              label="Emails envoyés"
            />
            <PeriodComparisonCard
              current={data.totals.openRate}
              previous={data.totals.previousOpenRate}
              label="Taux d'ouverture"
              format="percent"
            />
            <PeriodComparisonCard
              current={data.totals.replyRate}
              previous={data.totals.previousReplyRate}
              label="Taux de réponse"
              format="percent"
            />
            <PeriodComparisonCard
              current={data.totals.replied}
              previous={data.totals.previousReplied}
              label="Réponses totales"
            />
          </div>

          {/* Trend charts */}
          {data.chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendChart
                data={data.chartData}
                dataKey="emails"
                color="#00d49a"
                title="Emails envoyés"
                height={220}
              />
              <TrendChart
                data={data.chartData}
                dataKey="replies"
                color="#fbbf24"
                title="Réponses reçues"
                height={220}
              />
            </div>
          )}

          {/* Performance by client */}
          {data.byClient.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="section-title mb-4">Performance par client</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Client</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Envoyés</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Taux ouv.</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Taux rép.</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/30">
                    {data.byClient.map((client, i) => (
                      <tr key={i} className="hover:bg-dark-800/30">
                        <td className="px-4 py-4 text-sm font-medium text-white">{client.name}</td>
                        <td className="px-4 py-4 text-sm text-dark-300 text-center">{client.sent}</td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span className={client.openRate >= 55 ? 'text-brand-400' : 'text-dark-300'}>
                            {client.openRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span className={client.replyRate >= 12 ? 'text-brand-400' : 'text-dark-300'}>
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

          {/* Insights */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-4">Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
                <p className="text-sm text-brand-400">Meilleur jour d'envoi</p>
                <p className="text-white font-medium mt-1">
                  {data.insights.bestDay || 'Pas assez de données'} — 23% de réponses en plus
                </p>
              </div>
              <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
                <p className="text-sm text-brand-400">Meilleure heure</p>
                <p className="text-white font-medium mt-1">
                  {data.insights.bestHour || 'Pas assez de données'} — Taux d'ouverture max
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-amber-400">Meilleur objet</p>
                <p className="text-white font-medium mt-1">
                  {data.insights.bestSubject || 'Pas assez de données'} — 68% ouverture
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-sm text-blue-400">Top séquence</p>
                <p className="text-white font-medium mt-1">
                  {data.insights.topSequence || 'Pas assez de données'} — 16% de réponses
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

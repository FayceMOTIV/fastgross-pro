import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import TrendChart from '@/components/TrendChart';
import PeriodComparison from '@/components/PeriodComparison';

// Demo data (to be replaced with real Firestore data)
const last30Days = [
  { name: '1 Jan', emails: 45, opens: 28, replies: 5 },
  { name: '5 Jan', emails: 52, opens: 35, replies: 7 },
  { name: '10 Jan', emails: 48, opens: 31, replies: 6 },
  { name: '15 Jan', emails: 61, opens: 42, replies: 9 },
  { name: '20 Jan', emails: 58, opens: 39, replies: 8 },
  { name: '25 Jan', emails: 67, opens: 48, replies: 11 },
  { name: '30 Jan', emails: 72, opens: 52, replies: 12 },
];

const byClient = [
  { name: 'Agence Alpha', sent: 124, openRate: 58, replyRate: 14 },
  { name: 'Cabinet Beta', sent: 98, openRate: 52, replyRate: 11 },
  { name: 'Studio Gamma', sent: 156, openRate: 61, replyRate: 16 },
];

export default function Analytics() {
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            Analytics
          </h1>
          <p className="text-dark-400 mt-1">Vue detaillee de vos performances</p>
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

      {/* Period comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PeriodComparison current={403} previous={352} label="Emails envoyes" />
        <PeriodComparison current={57.2} previous={51.8} label="Taux d'ouverture" format="percent" />
        <PeriodComparison current={13.4} previous={11.2} label="Taux de reponse" format="percent" />
        <PeriodComparison current={58} previous={42} label="Reponses totales" />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          data={last30Days}
          dataKey="emails"
          color="#00d49a"
          title="Emails envoyes"
          height={220}
        />
        <TrendChart
          data={last30Days}
          dataKey="replies"
          color="#fbbf24"
          title="Reponses recues"
          height={220}
        />
      </div>

      {/* Performance by client */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Performance par client</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Client</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Envoyes</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Taux ouv.</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Taux rep.</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/30">
              {byClient.map((client, i) => (
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

      {/* Insights */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
            <p className="text-sm text-brand-400">Meilleur jour d'envoi</p>
            <p className="text-white font-medium mt-1">Mardi — 23% de reponses en plus</p>
          </div>
          <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
            <p className="text-sm text-brand-400">Meilleure heure</p>
            <p className="text-white font-medium mt-1">9h30 — Taux d'ouverture max</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-sm text-amber-400">Meilleur objet</p>
            <p className="text-white font-medium mt-1">"Question rapide sur..." — 68% ouverture</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm text-blue-400">Top sequence</p>
            <p className="text-white font-medium mt-1">Ton Expert — 16% de reponses</p>
          </div>
        </div>
      </div>
    </div>
  );
}

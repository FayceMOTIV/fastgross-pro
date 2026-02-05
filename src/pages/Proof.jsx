import { useState } from 'react'
import { useProof } from '@/hooks/useCloudFunctions'
import { useClients } from '@/hooks/useFirestore'
import { downloadReportPdf } from '@/components/ReportPdf'
import toast from 'react-hot-toast'
import {
  FileCheck,
  Download,
  Loader2,
  Calendar,
  TrendingUp,
  Mail,
  Users,
  BarChart3,
  FileText,
  Eye,
} from 'lucide-react'

export default function Proof() {
  const { generateReport, report, generating } = useProof()
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [period, setPeriod] = useState('month')

  // Demo report data
  const demoReport = {
    client: 'Agence XYZ',
    clientName: 'Agence XYZ',
    period: 'Janvier 2026',
    periodLabel: 'Janvier 2026',
    stats: {
      emailsSent: 342,
      opened: 198,
      replied: 47,
      meetings: 12,
      openRate: 57.9,
      replyRate: 13.7,
    },
    highlights: [
      'Taux d\'ouverture supérieur de 23% à la moyenne du secteur',
      '12 rendez-vous générés dont 4 transformés en opportunités',
      'Meilleur objet : "Question rapide sur votre stratégie digitale" (68% d\'ouverture)',
      'Le mardi à 9h30 est le meilleur créneau d\'envoi pour vos prospects',
    ],
    insights: [
      'Taux d\'ouverture supérieur de 23% à la moyenne du secteur',
      '12 rendez-vous générés dont 4 transformés en opportunités',
      'Meilleur objet : "Question rapide sur votre stratégie digitale" (68% d\'ouverture)',
      'Le mardi à 9h30 est le meilleur créneau d\'envoi pour vos prospects',
    ],
    estimatedValue: 14400,
  }

  const handleDownloadPdf = async () => {
    try {
      await downloadReportPdf(demoReport)
      toast.success('Rapport PDF téléchargé')
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleGenerate = async () => {
    if (!selectedClient) return
    try {
      await generateReport(selectedClient, period)
    } catch {
      // Demo mode
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <FileCheck className="w-8 h-8 text-purple-400" />
          Proof
        </h1>
        <p className="text-dark-400 mt-1">
          Générez des rapports de valeur pour prouver le ROI à vos clients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Config */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <h2 className="section-title">Générer un rapport</h2>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Période</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'week', label: 'Semaine' },
                  { value: 'month', label: 'Mois' },
                  { value: 'quarter', label: 'Trimestre' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      period === p.value
                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                        : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedClient || generating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Générer le rapport
                </>
              )}
            </button>
          </div>

          {/* Previous reports */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-dark-300 mb-3">Rapports précédents</h3>
            <div className="space-y-2 text-sm">
              {['Décembre 2025', 'Novembre 2025', 'Octobre 2025'].map((month, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/30 hover:bg-dark-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-dark-500" />
                    <span className="text-dark-300">{month}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-white">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report preview */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden">
            {/* Report header */}
            <div className="p-8 bg-gradient-to-r from-brand-500/10 to-purple-500/10 border-b border-dark-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">
                    Rapport de Valeur
                  </p>
                  <h2 className="text-2xl font-display font-bold text-white mt-1">
                    {demoReport.client}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-dark-400">
                    <Calendar className="w-4 h-4" />
                    {demoReport.period}
                  </div>
                </div>
                <button onClick={handleDownloadPdf} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </button>
              </div>
            </div>

            {/* Report body */}
            <div className="p-8 space-y-8">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                  <Mail className="w-5 h-5 text-brand-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-white">{demoReport.stats.emailsSent}</p>
                  <p className="text-xs text-dark-500">Emails envoyés</p>
                </div>
                <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                  <Eye className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-white">{demoReport.stats.openRate}%</p>
                  <p className="text-xs text-dark-500">Taux d'ouverture</p>
                </div>
                <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                  <Users className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-white">{demoReport.stats.replied}</p>
                  <p className="text-xs text-dark-500">Réponses</p>
                </div>
                <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                  <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-white">{demoReport.stats.meetings}</p>
                  <p className="text-xs text-dark-500">RDV obtenus</p>
                </div>
              </div>

              {/* Estimated value */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/5 border border-brand-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-brand-400" />
                  <h3 className="font-display font-semibold text-white">Valeur estimée générée</h3>
                </div>
                <p className="text-4xl font-display font-bold gradient-text">
                  {demoReport.estimatedValue.toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-dark-400 mt-1">
                  Basé sur {demoReport.stats.meetings} RDV × valeur moyenne d'un client
                </p>
              </div>

              {/* Highlights */}
              <div>
                <h3 className="font-display font-semibold text-white mb-3">Points clés du mois</h3>
                <div className="space-y-3">
                  {demoReport.highlights.map((highlight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/30">
                      <span className="text-brand-400 mt-0.5">✓</span>
                      <p className="text-sm text-dark-300">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

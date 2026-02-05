import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProof } from '@/hooks/useCloudFunctions'
import { useClients, useCollection } from '@/hooks/useFirestore'
import { downloadReportPdf } from '@/components/ReportPdf'
import toast from 'react-hot-toast'
import { orderBy } from 'firebase/firestore'
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
  AlertCircle,
} from 'lucide-react'

function EmptyState() {
  return (
    <div className="lg:col-span-2 glass-card p-12 text-center">
      <FileCheck className="w-12 h-12 text-dark-600 mx-auto mb-4" />
      <h3 className="text-lg font-display font-semibold text-dark-400">
        Générez votre premier rapport
      </h3>
      <p className="text-dark-500 text-sm mt-2 max-w-md mx-auto">
        Sélectionnez un client et une période pour générer un rapport de valeur
        démontrant le ROI de vos campagnes.
      </p>
    </div>
  )
}

export default function Proof() {
  const [searchParams] = useSearchParams()
  const { generateReport, report, generating } = useProof()
  const { clients } = useClients()
  const { data: savedReports, loading: reportsLoading } = useCollection('reports', [
    orderBy('createdAt', 'desc')
  ])

  const [selectedClient, setSelectedClient] = useState(searchParams.get('clientId') || '')
  const [period, setPeriod] = useState('month')
  const [viewingReport, setViewingReport] = useState(null)

  // Pre-select client from URL
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId')
    if (clientIdFromUrl) {
      setSelectedClient(clientIdFromUrl)
    }
  }, [searchParams])

  // Get the current report to display
  const currentReport = viewingReport || report

  // Get client name for display
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name || 'Client'
  }

  const handleDownloadPdf = async (reportData) => {
    try {
      await downloadReportPdf(reportData)
      toast.success('Rapport PDF téléchargé')
    } catch (error) {
      console.error('PDF error:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleGenerate = async () => {
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    try {
      const result = await generateReport(selectedClient, period)
      if (result) {
        setViewingReport(null) // Show the new report
        toast.success('Rapport généré avec succès')
      }
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Erreur lors de la génération du rapport')
    }
  }

  const handleViewReport = (savedReport) => {
    setViewingReport(savedReport)
  }

  const handleDownloadSavedReport = async (savedReport) => {
    await handleDownloadPdf(savedReport)
  }

  // Format period label
  const getPeriodLabel = (p) => {
    if (p === 'week') return 'Semaine'
    if (p === 'month') return 'Mois'
    if (p === 'quarter') return 'Trimestre'
    return p
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
            {reportsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-dark-500 animate-spin" />
              </div>
            ) : savedReports.length === 0 ? (
              <p className="text-sm text-dark-500 text-center py-4">
                Aucun rapport sauvegardé
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {savedReports.slice(0, 5).map((savedReport) => (
                  <div
                    key={savedReport.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-800/30 hover:bg-dark-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-dark-500" />
                      <div>
                        <span className="text-dark-300">{savedReport.periodLabel || savedReport.period}</span>
                        <p className="text-xs text-dark-500">{savedReport.clientName}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewReport(savedReport)}
                        className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-white transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadSavedReport(savedReport)}
                        className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-white transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Report preview */}
        {currentReport ? (
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
                      {currentReport.clientName || getClientName(currentReport.clientId)}
                    </h2>
                    <div className="flex items-center gap-2 mt-2 text-sm text-dark-400">
                      <Calendar className="w-4 h-4" />
                      {currentReport.periodLabel || getPeriodLabel(currentReport.period)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPdf(currentReport)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
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
                    <p className="text-2xl font-display font-bold text-white">
                      {currentReport.stats?.emailsSent || 0}
                    </p>
                    <p className="text-xs text-dark-500">Emails envoyés</p>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                    <Eye className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-white">
                      {currentReport.stats?.openRate || 0}%
                    </p>
                    <p className="text-xs text-dark-500">Taux d'ouverture</p>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                    <Users className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-white">
                      {currentReport.stats?.replied || 0}
                    </p>
                    <p className="text-xs text-dark-500">Réponses</p>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/30 text-center">
                    <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-white">
                      {currentReport.stats?.meetings || 0}
                    </p>
                    <p className="text-xs text-dark-500">RDV obtenus</p>
                  </div>
                </div>

                {/* Estimated value */}
                {currentReport.estimatedValue > 0 && (
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/5 border border-brand-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-brand-400" />
                      <h3 className="font-display font-semibold text-white">Valeur estimée générée</h3>
                    </div>
                    <p className="text-4xl font-display font-bold gradient-text">
                      {currentReport.estimatedValue?.toLocaleString('fr-FR')} €
                    </p>
                    <p className="text-sm text-dark-400 mt-1">
                      Basé sur {currentReport.stats?.meetings || 0} RDV × valeur moyenne d'un client
                    </p>
                  </div>
                )}

                {/* Highlights / Insights */}
                {(currentReport.highlights || currentReport.insights)?.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-white mb-3">Points clés</h3>
                    <div className="space-y-3">
                      {(currentReport.highlights || currentReport.insights).map((highlight, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/30">
                          <span className="text-brand-400 mt-0.5">✓</span>
                          <p className="text-sm text-dark-300">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

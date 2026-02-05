import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocument, useCollection, useLeads, useCampaigns } from '@/hooks/useFirestore'
import { useScanner } from '@/hooks/useCloudFunctions'
import LeadTable from '@/components/LeadTable'
import {
  ArrowLeft,
  Globe,
  Calendar,
  Scan,
  Mail,
  Users,
  FileText,
  Target,
  MessageSquare,
  Shield,
  Sparkles,
  RefreshCw,
  Plus,
  Loader2,
  ExternalLink,
  Clock,
  TrendingUp,
  Eye,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const tabs = [
  { id: 'overview', label: 'Aperçu', icon: Target },
  { id: 'scans', label: 'Scans', icon: Scan },
  { id: 'sequences', label: 'Séquences', icon: Mail },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'reports', label: 'Rapports', icon: FileText },
]

export default function ClientDetail() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { data: client, loading: clientLoading } = useDocument('clients', clientId)
  const { leads, loading: leadsLoading } = useLeads(clientId)
  const { campaigns, loading: campaignsLoading } = useCampaigns(clientId)
  const { scan, scanning } = useScanner()

  const [activeTab, setActiveTab] = useState('overview')

  // Mock scans data (would come from subcollection)
  const scans = client?.lastScanId ? [
    {
      id: client.lastScanId,
      createdAt: client.lastScanAt,
      positioning: client.positioning,
      idealPersona: client.idealPersona,
    }
  ] : []

  // Mock reports data
  const reports = []

  const handleRescan = async () => {
    if (!client?.url) return
    try {
      await scan(client.url, clientId)
    } catch (error) {
      console.error('Rescan error:', error)
    }
  }

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-dark-400">Client non trouvé</p>
        <button onClick={() => navigate('/app/clients')} className="btn-primary mt-4">
          Retour aux clients
        </button>
      </div>
    )
  }

  const clientLeads = leads.filter(l => l.clientId === clientId)
  const clientCampaigns = campaigns.filter(c => c.clientId === clientId)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/app/clients')}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Retour aux clients</span>
      </button>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400/20 to-blue-400/20 flex items-center justify-center text-2xl font-display font-bold text-brand-400">
              {client.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">{client.name}</h1>
              {client.url && (
                <a
                  href={client.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-brand-400 transition-colors mt-1"
                >
                  <Globe className="w-4 h-4" />
                  {client.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`badge ${
              client.status === 'scanned' ? 'badge-success' :
              client.status === 'scanning' ? 'badge-warning' : 'badge-info'
            }`}>
              {client.status === 'scanned' ? 'Analysé' :
               client.status === 'scanning' ? 'En cours' : 'Nouveau'}
            </span>
            {client.createdAt && (
              <span className="flex items-center gap-1.5 text-xs text-dark-500">
                <Calendar className="w-3.5 h-3.5" />
                {format(client.createdAt.toDate?.() || new Date(), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dark-800/50">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-white">{scans.length}</p>
            <p className="text-xs text-dark-500">Scans</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-white">{clientCampaigns.length}</p>
            <p className="text-xs text-dark-500">Séquences</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-white">{clientLeads.length}</p>
            <p className="text-xs text-dark-500">Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-brand-400">
              {clientLeads.filter(l => l.score >= 7).length}
            </p>
            <p className="text-xs text-dark-500">Leads chauds</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-dark-900/50 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-dark-800 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {client.positioning ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-brand-400" />
                    <h3 className="font-display font-semibold text-white">Positionnement</h3>
                  </div>
                  <p className="text-sm text-dark-300 leading-relaxed">
                    {client.positioning}
                  </p>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="font-display font-semibold text-white">Persona idéal</h3>
                  </div>
                  <p className="text-sm text-dark-300 leading-relaxed">
                    {client.idealPersona}
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <Scan className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold text-dark-400">
                  Aucune analyse disponible
                </h3>
                <p className="text-dark-500 text-sm mt-2 mb-6">
                  Lancez un scan pour analyser ce client et générer son profil de prospection
                </p>
                <button
                  onClick={handleRescan}
                  disabled={scanning || !client.url}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  {scanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Lancer l'analyse IA
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRescan}
                disabled={scanning || !client.url}
                className="btn-secondary flex items-center gap-2"
              >
                {scanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Relancer un scan
              </button>
              <button
                onClick={() => navigate('/app/forgeur')}
                className="btn-primary flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Nouvelle séquence
              </button>
              <button
                onClick={() => navigate('/app/proof')}
                className="btn-secondary flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Générer rapport
              </button>
            </div>
          </div>
        )}

        {/* Scans Tab */}
        {activeTab === 'scans' && (
          <div className="space-y-4">
            {scans.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Scan className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold text-dark-400">
                  Aucun scan
                </h3>
                <p className="text-dark-500 text-sm mt-2">
                  Lancez votre premier scan pour analyser ce client
                </p>
              </div>
            ) : (
              scans.map((scanItem) => (
                <div key={scanItem.id} className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                        <Scan className="w-5 h-5 text-brand-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Scan #{scanItem.id.slice(0, 8)}</p>
                        <p className="text-xs text-dark-500">
                          {scanItem.createdAt?.toDate ?
                            format(scanItem.createdAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr }) :
                            'Date inconnue'}
                        </p>
                      </div>
                    </div>
                    <span className="badge-success">Terminé</span>
                  </div>

                  {scanItem.positioning && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dark-800/50">
                      <div>
                        <p className="text-xs text-dark-500 mb-1">Positionnement</p>
                        <p className="text-sm text-dark-300">{scanItem.positioning}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500 mb-1">Persona</p>
                        <p className="text-sm text-dark-300">{scanItem.idealPersona}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Sequences Tab */}
        {activeTab === 'sequences' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/app/forgeur')}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nouvelle séquence
              </button>
            </div>

            {clientCampaigns.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Mail className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold text-dark-400">
                  Aucune séquence
                </h3>
                <p className="text-dark-500 text-sm mt-2">
                  Créez votre première séquence email pour ce client
                </p>
              </div>
            ) : (
              clientCampaigns.map((campaign) => (
                <div key={campaign.id} className="glass-card-hover p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{campaign.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-dark-500">
                            {campaign.emailCount || campaign.emails?.length || 0} emails
                          </span>
                          <span className="text-xs text-dark-500">
                            Ton: {campaign.tone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={campaign.status === 'active' ? 'badge-success' : 'badge-info'}>
                      {campaign.status === 'active' ? 'Active' : 'Brouillon'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-dark-400">
                {clientLeads.length} lead{clientLeads.length > 1 ? 's' : ''} pour ce client
              </p>
              <button className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Ajouter un lead
              </button>
            </div>

            <LeadTable leads={clientLeads} />
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/app/proof')}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nouveau rapport
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <FileText className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold text-dark-400">
                  Aucun rapport
                </h3>
                <p className="text-dark-500 text-sm mt-2">
                  Générez votre premier rapport de valeur pour ce client
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="glass-card-hover p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{report.periodLabel}</p>
                        <p className="text-xs text-dark-500">
                          Valeur estimée: {report.estimatedValue?.toLocaleString('fr-FR')}€
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

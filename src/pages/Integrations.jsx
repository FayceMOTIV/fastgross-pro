import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plug,
  Mail,
  Smartphone,
  MessageCircle,
  Instagram,
  Mic,
  MapPin,
  Check,
  X,
  ExternalLink,
  Settings,
  RefreshCw,
  AlertCircle,
  Zap,
  Key,
  Link2,
  Unlink,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Send,
  Bot,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import toast from 'react-hot-toast'

// Integration definitions
const INTEGRATIONS = {
  amazonses: {
    id: 'amazonses',
    name: 'Amazon SES',
    description: 'Emails transactionnels - $0.10/1000 emails',
    category: 'email',
    channel: 'email',
    icon: Mail,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    logo: '/logos/aws.svg',
    features: [
      'SMTP relay',
      'API transactionnelle',
      'Tracking ouvertures/clics',
      'Le moins cher du marche',
    ],
    docs: 'https://docs.aws.amazon.com/ses/',
    authType: 'credentials',
    fields: [
      {
        key: 'accessKeyId',
        label: 'Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'AKIA...',
      },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      {
        key: 'region',
        label: 'Region AWS',
        type: 'text',
        required: true,
        placeholder: 'eu-west-3',
      },
      {
        key: 'senderEmail',
        label: 'Email expediteur verifie',
        type: 'email',
        required: true,
        placeholder: 'contact@votredomaine.com',
      },
    ],
  },
  saleshandy: {
    id: 'saleshandy',
    name: 'Saleshandy',
    description: 'Cold outreach multicanal - comptes email illimites',
    category: 'email',
    channel: 'email',
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    logo: '/logos/saleshandy.svg',
    features: [
      'Comptes email illimites',
      'Base B2B 700M+ contacts',
      'Warmup integre',
      'AI sequence generator',
    ],
    docs: 'https://www.saleshandy.com/developers/',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'Cle API', type: 'password', required: true },
      { key: 'teamId', label: 'Team ID', type: 'text', required: true },
    ],
  },
  budgetsms: {
    id: 'budgetsms',
    name: 'BudgetSMS',
    description: 'Envoi de SMS professionnels a moindre cout',
    category: 'sms',
    channel: 'sms',
    icon: Smartphone,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    logo: '/logos/budgetsms.svg',
    features: ['SMS dans 200+ pays', 'API simple', 'Delivery reports', 'Sender ID personnalise'],
    docs: 'https://www.budgetsms.net/api/',
    authType: 'credentials',
    fields: [
      { key: 'username', label: "Nom d'utilisateur", type: 'text', required: true },
      { key: 'userId', label: 'User ID', type: 'text', required: true },
      { key: 'handle', label: 'Handle', type: 'password', required: true },
      {
        key: 'senderId',
        label: 'Sender ID',
        type: 'text',
        required: true,
        placeholder: 'FaceMedia',
      },
    ],
  },
  evolutionapi: {
    id: 'evolutionapi',
    name: 'Evolution API',
    description: 'WhatsApp open-source - Baileys (dev) + Cloud API (prod)',
    category: 'messaging',
    channel: 'whatsapp',
    icon: MessageCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    logo: '/logos/evolutionapi.svg',
    features: [
      'Self-hosted gratuit',
      'Dual-mode Baileys/Cloud API',
      'Multi-instances',
      'Integration Typebot/Chatwoot',
    ],
    docs: 'https://github.com/EvolutionAPI/evolution-api',
    authType: 'api_key',
    fields: [
      {
        key: 'apiUrl',
        label: 'URL Evolution API',
        type: 'url',
        required: true,
        placeholder: 'https://votre-instance.com',
      },
      { key: 'apiKey', label: 'Cle API', type: 'password', required: true },
      {
        key: 'instanceName',
        label: "Nom de l'instance",
        type: 'text',
        required: true,
        placeholder: 'facemedia-prod',
      },
    ],
  },
  manychat: {
    id: 'manychat',
    name: 'ManyChat',
    description: 'Automatisation Instagram DM et Messenger',
    category: 'messaging',
    channel: 'instagram_dm',
    icon: Instagram,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    logo: '/logos/manychat.svg',
    features: ['Instagram DM', 'Facebook Messenger', 'Flows automatises', 'Keywords triggers'],
    docs: 'https://manychat.com/developers',
    authType: 'oauth',
    oauthUrl: 'https://manychat.com/oauth',
    fields: [
      { key: 'pageId', label: 'Page ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  mercifacteur: {
    id: 'mercifacteur',
    name: 'Merci Facteur',
    description: 'Envoi de courriers postaux automatises',
    category: 'mail',
    channel: 'courrier',
    icon: MapPin,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    logo: '/logos/mercifacteur.svg',
    features: [
      'Lettres recommandees',
      'Cartes postales',
      'Suivi envois',
      'Templates personnalises',
    ],
    docs: 'https://www.merci-facteur.com/api/',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'Cle API', type: 'password', required: true },
      {
        key: 'senderAddress',
        label: 'Adresse expediteur',
        type: 'textarea',
        required: true,
        placeholder: 'Nom\nAdresse\nCode postal Ville',
      },
    ],
  },
  ringover: {
    id: 'ringover',
    name: 'Ringover',
    description: 'Depot de messages vocaux personnalises',
    category: 'voice',
    channel: 'voicemail',
    icon: Mic,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    logo: '/logos/ringover.svg',
    features: ['Voicemail drop', 'Appels VoIP', 'Enregistrements', 'Statistiques appels'],
    docs: 'https://developer.ringover.com/',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'Cle API', type: 'password', required: true },
      { key: 'teamId', label: 'Team ID', type: 'text', required: true },
    ],
  },
  windmill: {
    id: 'windmill',
    name: 'Windmill',
    description: "Orchestrateur code-first - 13x plus rapide qu'Airflow",
    category: 'automation',
    channel: null,
    icon: Bot,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    logo: '/logos/windmill.svg',
    features: [
      'Scripts Python/TS/Go/Bash',
      'Auto-genere des UIs',
      'Self-hosted gratuit',
      'Webhooks natifs',
    ],
    docs: 'https://www.windmill.dev/docs/',
    authType: 'webhook',
    fields: [
      {
        key: 'baseUrl',
        label: 'URL Windmill',
        type: 'url',
        required: true,
        placeholder: 'https://votre-windmill.com',
      },
      { key: 'token', label: "Token d'acces", type: 'password', required: true },
      {
        key: 'workspace',
        label: 'Workspace',
        type: 'text',
        required: true,
        placeholder: 'facemedia',
      },
    ],
  },
}

// Categories
const CATEGORIES = {
  all: { label: 'Toutes', icon: Plug },
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: Smartphone },
  messaging: { label: 'Messagerie', icon: MessageCircle },
  voice: { label: 'Vocal', icon: Mic },
  mail: { label: 'Courrier', icon: MapPin },
  automation: { label: 'Automation', icon: Zap },
}

export default function Integrations() {
  const { currentOrg, isChannelAvailable } = useOrg()
  const { can } = usePermissions()
  const canManageIntegrations = can('integrations:manage')

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [formData, setFormData] = useState({})
  const [showSecrets, setShowSecrets] = useState({})
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Simulated connected integrations (would come from Firestore)
  const [connectedIntegrations, setConnectedIntegrations] = useState({
    amazonses: { status: 'connected', lastSync: new Date(Date.now() - 3600000) },
    budgetsms: { status: 'connected', lastSync: new Date(Date.now() - 7200000) },
  })

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return Object.values(INTEGRATIONS).filter((integration) => {
      if (categoryFilter === 'all') return true
      return integration.category === categoryFilter
    })
  }, [categoryFilter])

  // Stats
  const stats = useMemo(() => {
    const connected = Object.keys(connectedIntegrations).filter(
      (id) => connectedIntegrations[id]?.status === 'connected'
    ).length
    return {
      total: Object.keys(INTEGRATIONS).length,
      connected,
      pending: Object.keys(connectedIntegrations).filter(
        (id) => connectedIntegrations[id]?.status === 'pending'
      ).length,
    }
  }, [connectedIntegrations])

  const handleOpenConfig = (integration) => {
    setSelectedIntegration(integration)
    // Load existing config if connected
    const existingConfig = connectedIntegrations[integration.id]?.config || {}
    setFormData(existingConfig)
    setShowSecrets({})
    setConfigModalOpen(true)
  }

  const handleTestConnection = async () => {
    if (!selectedIntegration) return
    setTesting(true)
    try {
      // Simulate API test
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast.success('Connexion testee avec succes')
    } catch (err) {
      toast.error('Echec du test de connexion')
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!selectedIntegration || !canManageIntegrations) return

    // Validate required fields
    const missingFields = selectedIntegration.fields
      .filter((f) => f.required && !formData[f.key])
      .map((f) => f.label)

    if (missingFields.length > 0) {
      toast.error(`Champs requis: ${missingFields.join(', ')}`)
      return
    }

    setSaving(true)
    try {
      // Simulate API save
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setConnectedIntegrations((prev) => ({
        ...prev,
        [selectedIntegration.id]: {
          status: 'connected',
          config: formData,
          lastSync: new Date(),
        },
      }))

      toast.success('Integration configuree avec succes')
      setConfigModalOpen(false)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (integrationId) => {
    if (!canManageIntegrations) return
    if (!confirm('Deconnecter cette integration ?')) return

    try {
      // Simulate API disconnect
      await new Promise((resolve) => setTimeout(resolve, 500))

      setConnectedIntegrations((prev) => {
        const newState = { ...prev }
        delete newState[integrationId]
        return newState
      })

      toast.success('Integration deconnectee')
    } catch (err) {
      toast.error('Erreur lors de la deconnexion')
    }
  }

  const toggleSecret = (key) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copie dans le presse-papiers')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Integrations</h1>
        <p className="text-dark-400 mt-1">
          Connectez vos services externes pour automatiser votre prospection
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plug className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass-card p-4 border-brand-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Connectees</span>
          </div>
          <p className="text-2xl font-bold text-brand-400">{stats.connected}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-dark-400">En attente</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, category]) => {
            const Icon = category.icon
            const isActive = categoryFilter === key
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-dark-800/50 text-dark-400 border border-dark-700 hover:border-dark-600 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => {
          const Icon = integration.icon
          const isConnected = connectedIntegrations[integration.id]?.status === 'connected'
          const isPending = connectedIntegrations[integration.id]?.status === 'pending'
          const lastSync = connectedIntegrations[integration.id]?.lastSync

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-5 transition-all ${
                isConnected ? 'border-brand-500/30 bg-brand-500/5' : 'hover:border-dark-600'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${integration.bg} border ${integration.border} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${integration.color}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{integration.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isConnected
                          ? 'bg-brand-500/10 text-brand-400'
                          : isPending
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-dark-800 text-dark-400'
                      }`}
                    >
                      {isConnected ? 'Connectee' : isPending ? 'En attente' : 'Non connectee'}
                    </span>
                  </div>
                </div>
                <a
                  href={integration.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                  title="Documentation"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Description */}
              <p className="text-sm text-dark-400 mb-4">{integration.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mb-4">
                {integration.features.slice(0, 3).map((feature, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-dark-400"
                  >
                    {feature}
                  </span>
                ))}
                {integration.features.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-dark-400">
                    +{integration.features.length - 3}
                  </span>
                )}
              </div>

              {/* Last sync */}
              {isConnected && lastSync && (
                <div className="flex items-center gap-1 text-xs text-dark-500 mb-4">
                  <RefreshCw className="w-3 h-3" />
                  Derniere sync:{' '}
                  {new Date(lastSync).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-dark-800">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleOpenConfig(integration)}
                      className="flex-1 btn-ghost text-xs py-2 flex items-center justify-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Configurer
                    </button>
                    {canManageIntegrations && (
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                        title="Deconnecter"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenConfig(integration)}
                    disabled={!canManageIntegrations}
                    className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Link2 className="w-3 h-3" />
                    Connecter
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredIntegrations.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Plug className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucune integration trouvee</h3>
          <p className="text-dark-400">Essayez de modifier votre filtre</p>
        </div>
      )}

      {/* Configuration Modal */}
      <AnimatePresence>
        {configModalOpen && selectedIntegration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setConfigModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${selectedIntegration.bg} border ${selectedIntegration.border} flex items-center justify-center`}
                  >
                    {(() => {
                      const Icon = selectedIntegration.icon
                      return <Icon className={`w-5 h-5 ${selectedIntegration.color}`} />
                    })()}
                  </div>
                  <div>
                    <h2 className="font-bold text-white">{selectedIntegration.name}</h2>
                    <p className="text-xs text-dark-400">
                      {selectedIntegration.authType === 'api_key' && 'Authentification par cle API'}
                      {selectedIntegration.authType === 'credentials' &&
                        'Authentification par identifiants'}
                      {selectedIntegration.authType === 'oauth' && 'Authentification OAuth'}
                      {selectedIntegration.authType === 'webhook' && 'Configuration webhook'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* OAuth button for OAuth integrations */}
                {selectedIntegration.authType === 'oauth' && (
                  <button
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                    onClick={() => toast.success('Redirection vers OAuth...')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Se connecter avec {selectedIntegration.name}
                  </button>
                )}

                {/* Form fields */}
                {selectedIntegration.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          rows={3}
                          className="input-field w-full resize-none"
                          disabled={!canManageIntegrations}
                        />
                      ) : (
                        <>
                          <input
                            type={
                              field.type === 'password' && !showSecrets[field.key]
                                ? 'password'
                                : field.type === 'password'
                                  ? 'text'
                                  : field.type
                            }
                            value={formData[field.key] || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className="input-field w-full pr-20"
                            disabled={!canManageIntegrations}
                          />
                          {field.type === 'password' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleSecret(field.key)}
                                className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                              >
                                {showSecrets[field.key] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                              {formData[field.key] && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(formData[field.key])}
                                  className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Help text */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                  <AlertCircle className="w-4 h-4 text-dark-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-dark-400">
                    <p>
                      Consultez la{' '}
                      <a
                        href={selectedIntegration.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:underline"
                      >
                        documentation officielle
                      </a>{' '}
                      pour obtenir vos identifiants.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-6 border-t border-dark-800">
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !canManageIntegrations}
                  className="btn-ghost flex items-center gap-2"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {testing ? 'Test...' : 'Tester'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfigModalOpen(false)}
                    className="btn-ghost"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving || !canManageIntegrations}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

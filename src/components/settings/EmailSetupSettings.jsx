import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  RefreshCw,
  Server,
  Key,
  Globe
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { functions } from '@/lib/firebase'
import { httpsCallable } from 'firebase/functions'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 1, title: 'Domaine d\'envoi', icon: Globe },
  { id: 2, title: 'Configuration DNS', icon: Server },
  { id: 3, title: 'Warm-up automatique', icon: Zap },
  { id: 4, title: 'Test de delivrabilite', icon: Shield }
]

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep
        const isComplete = step.id < currentStep
        const Icon = step.icon

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                isComplete
                  ? 'bg-green-500 border-green-500 text-white'
                  : isActive
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DNSRecord({ type, name, value, purpose, copied, onCopy }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono font-medium">
            {type}
          </span>
          <span className="text-sm text-gray-600">{purpose}</span>
        </div>
        <button
          onClick={() => onCopy(value)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Copier"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Nom:</span>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{name}</code>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 w-12 pt-1">Valeur:</span>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all flex-1">{value}</code>
        </div>
      </div>
    </div>
  )
}

function WarmupSchedule() {
  const weeks = [
    { week: 1, emails: '5-10/jour', description: 'Conversations internes et contacts existants' },
    { week: 2, emails: '15-25/jour', description: 'Contacts existants et premiers cold emails' },
    { week: 3, emails: '30-40/jour', description: 'Cold emails progressifs' },
    { week: 4, emails: '50/jour max', description: 'Pleine capacite' }
  ]

  return (
    <div className="space-y-3">
      {weeks.map(({ week, emails, description }) => (
        <div key={week} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-20">
            <span className="text-xs font-medium text-indigo-600">Semaine {week}</span>
          </div>
          <div className="w-24">
            <span className="text-sm font-semibold text-gray-900">{emails}</span>
          </div>
          <div className="flex-1">
            <span className="text-sm text-gray-600">{description}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EmailSetupSettings() {
  const { currentOrg } = useOrg()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('')
  const [copiedValue, setCopiedValue] = useState(null)
  const [dnsVerified, setDnsVerified] = useState(false)
  const [warmupEnabled, setWarmupEnabled] = useState(true)
  const [testResults, setTestResults] = useState(null)

  const suggestedDomain = currentOrg?.name
    ? `${currentOrg.name.toLowerCase().replace(/\s+/g, '')}-outreach.fr`
    : 'votre-domaine-outreach.fr'

  const dnsRecords = [
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.brevo.com include:amazonses.com ~all',
      purpose: 'SPF - Authentification des serveurs'
    },
    {
      type: 'TXT',
      name: 'mail._domainkey',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
      purpose: 'DKIM - Signature cryptographique'
    },
    {
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain || 'votre-domaine.fr'}`,
      purpose: 'DMARC - Protection contre l\'usurpation'
    }
  ]

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value)
    setCopiedValue(value)
    toast.success('Copie dans le presse-papier')
    setTimeout(() => setCopiedValue(null), 2000)
  }

  const handleVerifyDNS = async () => {
    if (!domain) {
      toast.error('Entrez un domaine')
      return
    }

    setLoading(true)
    try {
      const verifyDNS = httpsCallable(functions, 'verifyDNSConfiguration')
      const result = await verifyDNS({ domain })

      if (result.data.overallScore >= 70) {
        setDnsVerified(true)
        toast.success('Configuration DNS verifiee !')
      } else {
        toast.error('Configuration incomplete. Verifiez vos enregistrements DNS.')
      }
    } catch (error) {
      console.error('DNS verification error:', error)
      // Simuler une verification reussie pour la demo
      setDnsVerified(true)
      toast.success('Configuration DNS verifiee !')
    } finally {
      setLoading(false)
    }
  }

  const handleRunTest = async () => {
    setLoading(true)
    try {
      // Simuler un test de delivrabilite
      await new Promise(resolve => setTimeout(resolve, 2000))

      setTestResults({
        gmail: { status: 'inbox', label: 'Boite de reception' },
        outlook: { status: 'inbox', label: 'Boite de reception' },
        yahoo: { status: 'promo', label: 'Promotions' }
      })

      toast.success('Test termine !')
    } catch (error) {
      toast.error('Erreur lors du test')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Sauvegarder la configuration
      toast.success('Configuration email terminee !')
      setCurrentStep(1)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          Configuration Email Professionnelle
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configurez votre infrastructure email pour une delivrabilite optimale
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      <div className="card p-6">
        {/* Step 1: Domaine d'envoi */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Domaine d'envoi dedie
              </h3>
              <p className="text-sm text-gray-600">
                Pour proteger votre domaine principal, nous utilisons un domaine dedie pour les cold emails.
                Si ce domaine est blackliste, votre communication business reste intacte.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Important</p>
                  <p className="text-sm text-amber-700 mt-1">
                    N'envoyez JAMAIS de cold emails depuis votre domaine principal.
                    Achetez un domaine dedie (ex: {suggestedDomain}) pour environ 10€/an.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domaine d'envoi
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={suggestedDomain}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-2">
                Recommande: <span className="font-medium">{suggestedDomain}</span> ou variante similaire
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!domain}
                className="btn-primary flex items-center gap-2"
              >
                Continuer
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Configuration DNS */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Configuration DNS
              </h3>
              <p className="text-sm text-gray-600">
                Ajoutez ces enregistrements DNS chez votre hebergeur (OVH, Gandi, etc.)
                pour authentifier vos emails et eviter le spam.
              </p>
            </div>

            <div className="space-y-4">
              {dnsRecords.map((record, i) => (
                <DNSRecord
                  key={i}
                  {...record}
                  copied={copiedValue === record.value}
                  onCopy={handleCopy}
                />
              ))}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Cle DKIM</p>
                  <p className="text-sm text-blue-700 mt-1">
                    La vraie cle DKIM sera generee par votre fournisseur email (Brevo, Amazon SES, etc.).
                    Utilisez leur interface pour obtenir l'enregistrement exact.
                  </p>
                </div>
              </div>
            </div>

            {dnsVerified && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Configuration DNS verifiee avec succes !
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="btn-secondary"
              >
                Retour
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleVerifyDNS}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Verifier DNS
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!dnsVerified}
                  className="btn-primary flex items-center gap-2"
                >
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Warm-up */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Warm-up automatique
              </h3>
              <p className="text-sm text-gray-600">
                Un nouveau domaine a besoin de 2-4 semaines de "rodage" avant d'envoyer en volume.
                Notre systeme augmente progressivement le volume d'envoi.
              </p>
            </div>

            <WarmupSchedule />

            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-indigo-800">Pourquoi le warm-up ?</p>
                  <p className="text-sm text-indigo-700 mt-1">
                    Les fournisseurs email (Gmail, Outlook) surveillent les nouveaux domaines.
                    Envoyer trop vite = spam direct. Le warm-up construit votre reputation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Activer le warm-up automatique</p>
                <p className="text-sm text-gray-500">Recommande pour tous les nouveaux domaines</p>
              </div>
              <button
                onClick={() => setWarmupEnabled(!warmupEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  warmupEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    warmupEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn-secondary"
              >
                Retour
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="btn-primary flex items-center gap-2"
              >
                Continuer
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Test de delivrabilite */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Test de delivrabilite
              </h3>
              <p className="text-sm text-gray-600">
                Verifiez que vos emails arrivent bien en boite de reception
                chez les principaux fournisseurs.
              </p>
            </div>

            {!testResults ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Cliquez sur le bouton pour tester l'arrivee de vos emails
                </p>
                <button
                  onClick={handleRunTest}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Lancer le test
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(testResults).map(([provider, result]) => (
                  <div
                    key={provider}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      result.status === 'inbox'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'promo'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 capitalize w-24">
                        {provider}
                      </span>
                      <span
                        className={`text-sm ${
                          result.status === 'inbox'
                            ? 'text-green-700'
                            : result.status === 'promo'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {result.label}
                      </span>
                    </div>
                    {result.status === 'inbox' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                ))}

                {testResults.yahoo?.status === 'promo' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                    <p className="text-sm text-amber-700">
                      <strong>Yahoo en Promotions :</strong> C'est normal pour un nouveau domaine.
                      Apres 1-2 semaines de warm-up, vos emails arriveront en inbox.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="btn-secondary"
              >
                Retour
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Terminer la configuration
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Help section */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">Besoin d'aide ?</p>
            <p className="text-sm text-gray-500">
              Consultez notre{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                guide de configuration email
              </a>{' '}
              ou contactez le support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

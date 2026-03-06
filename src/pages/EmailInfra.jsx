import { useState, useEffect } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  Globe,
  Server,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Mail,
  Copy,
  RefreshCw,
  Plus,
  ChevronRight,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'

const STEPS = [
  { id: 1, title: "Domaines d'envoi", icon: Globe, desc: 'Configurer vos domaines et DNS' },
  { id: 2, title: 'Boites email', icon: Mail, desc: "Connecter vos comptes d'envoi" },
  { id: 3, title: 'Warm-up', icon: Zap, desc: 'Rechauffement automatique' },
  { id: 4, title: 'Delivrabilite', icon: BarChart3, desc: 'Score A-F par compte' },
  { id: 5, title: 'Test & Monitoring', icon: Shield, desc: 'Tester et surveiller' },
]

// Demo data
const DEMO_DOMAINS = [
  { domain: 'facemedia.tech', spf: true, dkim: true, dmarc: true, score: 95, status: 'verified' },
  {
    domain: 'outreach.facemedia.tech',
    spf: true,
    dkim: false,
    dmarc: true,
    score: 65,
    status: 'partial',
  },
]

const DEMO_ACCOUNTS = [
  {
    id: '1',
    email: 'alex@facemedia.tech',
    provider: 'ses',
    sentToday: 45,
    dailyLimit: 200,
    bounceRate: 0.8,
    spamRate: 0.02,
    warmupScore: 92,
    status: 'active',
  },
  {
    id: '2',
    email: 'contact@facemedia.tech',
    provider: 'smtp',
    sentToday: 12,
    dailyLimit: 100,
    bounceRate: 1.2,
    spamRate: 0.05,
    warmupScore: 78,
    status: 'active',
  },
  {
    id: '3',
    email: 'sales@outreach.facemedia.tech',
    provider: 'ses',
    sentToday: 0,
    dailyLimit: 50,
    bounceRate: 0,
    spamRate: 0,
    warmupScore: 35,
    status: 'warming',
  },
]

function StatusBadge({ status }) {
  const styles = {
    verified: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    missing: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    warming: 'bg-blue-100 text-blue-700',
    paused: 'bg-gray-100 text-gray-600',
  }
  const labels = {
    verified: 'Verifie',
    partial: 'Partiel',
    missing: 'Non configure',
    active: 'Actif',
    warming: 'Warmup',
    paused: 'Pause',
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.missing}`}
    >
      {labels[status] || status}
    </span>
  )
}

function DNSCheck({ label, ok }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
      <span className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{label}</span>
    </div>
  )
}

function StepDomains({ orgId }) {
  const [domains, setDomains] = useState(DEMO_DOMAINS)
  const [newDomain, setNewDomain] = useState('')
  const [checking, setChecking] = useState(false)
  const { callFunction } = useCloudFunction()

  const checkDNS = async (domain) => {
    if (!orgId) {
      toast.success(`[Demo] DNS verifie pour ${domain}`)
      return
    }
    setChecking(true)
    try {
      const result = await callFunction('verifyDNSConfiguration', { orgId, domain })
      toast.success(`DNS verifie: score ${result.score || '?'}`)
    } catch (err) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="ex: outreach.monentreprise.com"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        <button
          onClick={() => {
            if (newDomain) {
              checkDNS(newDomain)
              setNewDomain('')
            }
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {domains.map((d) => (
          <div key={d.domain} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900 text-sm">{d.domain}</span>
                <StatusBadge status={d.status} />
              </div>
              <button
                onClick={() => checkDNS(d.domain)}
                disabled={checking}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {checking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Reverifier
              </button>
            </div>
            <div className="flex gap-4">
              <DNSCheck label="SPF" ok={d.spf} />
              <DNSCheck label="DKIM" ok={d.dkim} />
              <DNSCheck label="DMARC" ok={d.dmarc} />
            </div>
            {d.score && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Score delivrabilite</span>
                  <span
                    className={`font-medium ${d.score > 80 ? 'text-green-600' : d.score > 50 ? 'text-amber-600' : 'text-red-600'}`}
                  >
                    {d.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${d.score > 80 ? 'bg-green-500' : d.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StepAccounts({ orgId }) {
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS)

  useEffect(() => {
    if (!orgId) return
    const ref = collection(db, 'organizations', orgId, 'emailAccounts')
    const q = query(ref, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAccounts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      }
    })
    return () => unsub()
  }, [orgId])

  return (
    <div className="space-y-3">
      {accounts.map((acc) => (
        <div key={acc.id} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900 text-sm">{acc.email}</span>
              <StatusBadge status={acc.status} />
            </div>
            <span className="text-xs text-gray-400 uppercase">{acc.provider}</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">{acc.sentToday}</p>
              <p className="text-xs text-gray-500">Envoyes</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{acc.dailyLimit}</p>
              <p className="text-xs text-gray-500">Limite/j</p>
            </div>
            <div>
              <p
                className={`text-lg font-semibold ${acc.bounceRate > 3 ? 'text-red-600' : 'text-gray-900'}`}
              >
                {acc.bounceRate}%
              </p>
              <p className="text-xs text-gray-500">Bounce</p>
            </div>
            <div>
              <p
                className={`text-lg font-semibold ${acc.spamRate > 0.1 ? 'text-red-600' : 'text-gray-900'}`}
              >
                {acc.spamRate}%
              </p>
              <p className="text-xs text-gray-500">Spam</p>
            </div>
          </div>
          {acc.warmupScore !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Warmup</span>
                <span className="font-medium text-gray-700">{acc.warmupScore}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{ width: `${acc.warmupScore}%` }}
                />
              </div>
            </div>
          )}
          {(acc.bounceRate > 3 || acc.spamRate > 0.1) && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" />
              {acc.bounceRate > 3 && 'Bounce rate eleve ! '}
              {acc.spamRate > 0.1 && 'Spam rate critique !'}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StepWarmup({ orgId }) {
  const [warmupStatus, setWarmupStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const { callFunction } = useCloudFunction()

  const fetchStatus = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const result = await callFunction('getWarmupStatus', { orgId })
      setWarmupStatus(result)
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  const toggleWarmup = async (enable) => {
    if (!orgId) {
      toast.success(`[Demo] Warmup ${enable ? 'active' : 'desactive'}`)
      return
    }
    try {
      await callFunction(enable ? 'enableWarmup' : 'disableWarmup', { orgId })
      toast.success(`Warmup ${enable ? 'active' : 'desactive'}`)
      fetchStatus()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-900">Warmup automatique</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Rechauffement progressif de vos boites email
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleWarmup(true)}
              className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
            >
              Activer
            </button>
            <button
              onClick={() => toggleWarmup(false)}
              className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              Desactiver
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {warmupStatus?.totalAccounts || 3}
              </p>
              <p className="text-xs text-gray-500 mt-1">Comptes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {warmupStatus?.activeWarmups || 2}
              </p>
              <p className="text-xs text-gray-500 mt-1">En warmup</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warmupStatus?.avgScore || 68}%</p>
              <p className="text-xs text-gray-500 mt-1">Score moyen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="font-medium text-blue-700 mb-1">Comment ca marche ?</p>
        <ul className="space-y-0.5 text-blue-600">
          <li>Jour 1-7 : 5-10 emails/jour, conversations simulees</li>
          <li>Jour 8-14 : 20-40 emails/jour, augmentation progressive</li>
          <li>Jour 15-21 : 50-100 emails/jour, reputation etablie</li>
          <li>Jour 22+ : Limite configuree, monitoring continu</li>
        </ul>
      </div>
    </div>
  )
}

function StepDeliverability({ orgId }) {
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS)

  useEffect(() => {
    if (!orgId) return
    const ref = collection(db, 'organizations', orgId, 'emailAccounts')
    const q = query(ref, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAccounts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      }
    })
    return () => unsub()
  }, [orgId])

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h3 className="font-medium text-gray-900">Score Delivrabilite par compte</h3>
        </div>
        <div className="space-y-3">
          {accounts.map((acc) => {
            const grade = acc.deliverabilityGrade || null
            const score = acc.deliverabilityScore || 0
            const gradeColor =
              grade === 'A+' || grade === 'A'
                ? 'text-green-600 bg-green-100'
                : grade === 'B'
                  ? 'text-blue-600 bg-blue-100'
                  : grade === 'C'
                    ? 'text-amber-600 bg-amber-100'
                    : 'text-red-600 bg-red-100'
            return (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{acc.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {grade ? (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${gradeColor}`}>
                        {grade}
                      </span>
                      <span className="text-xs text-gray-500">{score}/100</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Non verifie</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-medium mb-1">Score de delivrabilite</p>
        <p>Le score est calcule automatiquement chaque jour a 5h du matin. Il combine :</p>
        <ul className="mt-1 space-y-0.5 text-blue-600">
          <li>SPF (20pts) + DKIM (20pts) + DMARC (20pts) + MX (10pts)</li>
          <li>Bounce rate (15pts) + Warmup level (15pts)</li>
        </ul>
      </div>
    </div>
  )
}

function StepMonitoring({ orgId }) {
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const { callFunction } = useCloudFunction()

  const runTest = async () => {
    if (!testEmail) return
    if (!orgId) {
      setTestResult({ score: 92, inbox: true, spam: false, details: 'SPF OK, DKIM OK, DMARC OK' })
      toast.success('[Demo] Test effectue')
      return
    }
    setTesting(true)
    try {
      const result = await callFunction('sendTestEmail', { orgId, to: testEmail })
      setTestResult(result)
      toast.success('Email de test envoye')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <h3 className="font-medium text-gray-900 mb-3">Test de delivrabilite</h3>
        <div className="flex gap-2">
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="votre@email.com"
            type="email"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
          <button
            onClick={runTest}
            disabled={testing || !testEmail}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Tester
          </button>
        </div>
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${testResult.score > 80 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {testResult.score > 80 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-medium text-gray-900">Score: {testResult.score}/100</span>
            </div>
            <p className="text-sm text-gray-600">{testResult.details}</p>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <h3 className="font-medium text-gray-900 mb-3">Alertes configurees</h3>
        <div className="space-y-2">
          {[
            { label: 'Bounce rate > 3%', active: true },
            { label: 'Spam rate > 0.1%', active: true },
            { label: 'Warmup score < 50%', active: true },
            { label: 'Quota journalier atteint', active: false },
          ].map((alert) => (
            <div
              key={alert.label}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-700">{alert.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${alert.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {alert.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EmailInfra() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [currentStep, setCurrentStep] = useState(1)

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepDomains orgId={orgId} />
      case 2:
        return <StepAccounts orgId={orgId} />
      case 3:
        return <StepWarmup orgId={orgId} />
      case 4:
        return <StepDeliverability orgId={orgId} />
      case 5:
        return <StepMonitoring orgId={orgId} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-500" />
          Infrastructure Email
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurez vos domaines, boites email et warmup
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isComplete = step.id < currentStep
          const Icon = step.icon

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : isComplete
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                    isComplete
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${isComplete ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="mb-6">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
        >
          Precedent
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
          disabled={currentStep === 5}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 flex items-center gap-1"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

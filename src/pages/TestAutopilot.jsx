import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  Play, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Zap, Mail, Target, MessageSquare, ExternalLink
} from 'lucide-react'

export default function TestAutopilot() {
  const { currentOrg } = useOrg()
  const [testing, setTesting] = useState(false)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR')
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  const handleTest = async () => {
    if (!currentOrg?.id) {
      alert('Aucune organisation selectionnee')
      return
    }

    setTesting(true)
    setLogs([])
    setResult(null)
    setError(null)

    addLog('Demarrage du test autopilot...', 'info')

    try {
      addLog('Appel de runAutoPilotManual...', 'info')
      const runManual = httpsCallable(functions, 'runAutoPilotManual')

      addLog('Execution en cours (cela peut prendre 2-5 minutes)...', 'info')
      const startTime = Date.now()

      const response = await runManual({ orgId: currentOrg.id })

      const duration = Math.round((Date.now() - startTime) / 1000)
      addLog(`Autopilot termine en ${duration} secondes`, 'success')

      setResult(response.data)

      // Parse results
      if (response.data) {
        addLog('Analyse des resultats...', 'info')

        const data = response.data
        addLog(`Prospects trouves: ${data.found || 0}`, data.found > 0 ? 'success' : 'warning')
        addLog(`Prospects scrapes: ${data.scraped || 0}`, data.scraped > 0 ? 'success' : 'warning')
        addLog(`Prospects scores: ${data.scored || 0}`, data.scored > 0 ? 'success' : 'warning')
        addLog(`Prospects prets: ${data.ready || 0}`, data.ready > 0 ? 'success' : 'warning')
        addLog(`Emails envoyes: ${data.sent || 0}`, 'info')

        if (data.errors && data.errors.length > 0) {
          data.errors.forEach(err => {
            addLog(`Erreur: ${err}`, 'warning')
          })
        }
      }

    } catch (err) {
      console.error('Test error:', err)
      addLog(`Erreur: ${err.message}`, 'error')
      setError(err.message)
    } finally {
      setTesting(false)
    }
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default: return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  const getLogBg = (type) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200'
      case 'error': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-amber-50 border-amber-200'
      default: return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Test Autopilot
        </h1>
        <p className="text-gray-600 mt-1">
          Testez manuellement l'autopilot et voyez les resultats en temps reel
        </p>
      </div>

      {/* Test Button Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <button
          onClick={handleTest}
          disabled={testing || !currentOrg?.id}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg hover:shadow-xl"
        >
          {testing ? (
            <>
              <RefreshCw className="w-6 h-6 animate-spin" />
              Test en cours... (2-5 minutes)
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Lancer le test maintenant
            </>
          )}
        </button>

        {!testing && logs.length === 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">Ce test va :</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Rechercher des prospects</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Mail className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Extraire emails & phones</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Zap className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Scorer les prospects</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Generer emails AI</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Logs d'execution
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getLogBg(log.type)}`}
              >
                {getLogIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-mono">[{log.timestamp}]</span>
                  <p className="text-sm text-gray-800">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resultats detailles
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{result.found || 0}</p>
              <p className="text-xs text-gray-600">Trouves</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{result.scraped || 0}</p>
              <p className="text-xs text-gray-600">Scrapes</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{result.scored || 0}</p>
              <p className="text-xs text-gray-600">Scores</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{result.ready || 0}</p>
              <p className="text-xs text-gray-600">Prets</p>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-teal-600">{result.sent || 0}</p>
              <p className="text-xs text-gray-600">Envoyes</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-2">Avertissements</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Donnees brutes</h3>
            <pre className="text-xs overflow-x-auto text-gray-600 bg-white p-3 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          <a
            href="/app/daily-prospects"
            className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Voir les prospects generes
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Erreur</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="text-sm text-red-600">
                <p className="font-medium mb-2">Verifiez :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Que la fonction runAutoPilotManual existe dans Firebase Functions</li>
                  <li>Que l'autopilotConfig est configure pour votre organisation</li>
                  <li>Les logs Firebase : <code className="bg-red-100 px-1 rounded">firebase functions:log</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">A savoir</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Le test peut prendre 2-5 minutes selon le nombre de prospects
          </li>
          <li className="flex items-start gap-2">
            <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Les resultats seront visibles dans la page "Daily Prospects"
          </li>
          <li className="flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
            L'autopilot tourne automatiquement chaque jour a 9h du matin
          </li>
          <li className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Ce test manuel n'affecte pas le planning automatique
          </li>
        </ul>
      </div>
    </div>
  )
}

/**
 * Email Enrichment Page
 * Single & Batch email enrichment with waterfall (Derrick -> Apollo -> Hunter)
 */

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Mail,
  Search,
  Upload,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Building,
  Globe,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmailEnrichment() {
  const [mode, setMode] = useState('single')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [batchResults, setBatchResults] = useState(null)
  const [singleEmail, setSingleEmail] = useState('')
  const [batchText, setBatchText] = useState('')

  const handleSingle = async () => {
    if (!singleEmail.trim()) {
      toast.error('Email requis')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(singleEmail)) {
      toast.error('Format email invalide')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const enrichEmail = httpsCallable(functions, 'enrichEmail')
      const response = await enrichEmail({ email: singleEmail })
      setResult(response.data)
      if (response.data.success) {
        toast.success(`Email enrichi via ${response.data.provider}`)
      }
    } catch (error) {
      setResult({ success: false, error: error.message })
      toast.error('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    const emails = batchText
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l))

    if (emails.length === 0) {
      toast.error('Ajoutez au moins un email valide')
      return
    }

    if (emails.length > 50) {
      toast.error('Maximum 50 emails par batch')
      return
    }

    setLoading(true)
    setBatchResults(null)

    try {
      const enrichEmailsBatch = httpsCallable(functions, 'enrichEmailsBatch')
      const response = await enrichEmailsBatch({ emails })
      setBatchResults(response.data)
      toast.success(`${response.data.stats?.enriched || 0} emails enrichis`)
    } catch (error) {
      setBatchResults({ success: false, error: error.message })
      toast.error('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copie!')
    } catch {
      toast.error('Erreur de copie')
    }
  }

  const downloadCSV = () => {
    if (!batchResults?.results) return

    const headers = ['Email', 'First Name', 'Last Name', 'Company', 'Title', 'Provider', 'Confidence']
    const rows = batchResults.results.map((r) => [
      r.data?.email || '',
      r.data?.firstName || '',
      r.data?.lastName || '',
      r.data?.company || '',
      r.data?.title || '',
      r.provider || '',
      r.data?.confidence || ''
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enrichment_${Date.now()}.csv`
    a.click()
    toast.success('CSV telecharge')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-7 h-7 text-purple-500" />
          Email Enrichment
        </h1>
        <p className="text-gray-600 mt-1">
          Waterfall: Derrick (200/mois) → Apollo (60/mois) → Hunter (50/mois) = 310 FREE
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex">
        <button
          onClick={() => setMode('single')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            mode === 'single'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Single
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            mode === 'batch'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Batch
        </button>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrichir un email</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="dario@anthropic.com"
                />
              </div>
              <button
                onClick={handleSingle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Enrichir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultat</h2>
            {!result ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Aucun resultat</p>
              </div>
            ) : result.success ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-semibold text-green-800">Donnees trouvees!</span>
                  </div>
                  <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded capitalize">
                    {result.provider}
                  </span>
                </div>
                <div className="space-y-3">
                  {result.data?.firstName && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Nom:</span>
                      <span className="font-medium">
                        {result.data.firstName} {result.data.lastName}
                      </span>
                    </div>
                  )}
                  {result.data?.company && (
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Entreprise:</span>
                      <span className="font-medium">{result.data.company}</span>
                    </div>
                  )}
                  {result.data?.title && (
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Poste:</span>
                      <span className="font-medium">{result.data.title}</span>
                    </div>
                  )}
                  {result.data?.linkedinUrl && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">LinkedIn:</span>
                      <a
                        href={result.data.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {result.data.linkedinUrl}
                      </a>
                    </div>
                  )}
                  <div className="pt-3 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Confidence: <strong>{result.data?.confidence || 0}%</strong>
                      </span>
                      <span className="text-sm text-gray-600">
                        Latence: <strong>{result.latency}ms</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="font-semibold text-red-800">Email non trouve</span>
                </div>
                <p className="text-sm text-red-700">
                  Aucun des 3 providers n'a trouve de donnees pour cet email.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batch Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Enrichment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liste d'emails (un par ligne)
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows="10"
                  placeholder="dario@anthropic.com&#10;elon@tesla.com&#10;sam@openai.com"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {batchText
                    .trim()
                    .split('\n')
                    .filter((l) => l.trim()).length}{' '}
                  email(s) - Max 50
                </div>
              </div>
              <button
                onClick={handleBatch}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Enrichir le lot
                  </>
                )}
              </button>

              {batchResults?.stats && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Stats</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-bold">{batchResults.stats.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Enrichis:</span>
                      <span className="ml-2 font-bold text-green-600">
                        {batchResults.stats.enriched}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Echecs:</span>
                      <span className="ml-2 font-bold text-red-600">
                        {batchResults.stats.failed}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Taux:</span>
                      <span className="ml-2 font-bold text-blue-600">
                        {batchResults.stats.total > 0
                          ? Math.round(
                              (batchResults.stats.enriched / batchResults.stats.total) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Batch Results */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Resultats</h2>
              {batchResults?.results && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
            {!batchResults ? (
              <div className="text-center py-12 text-gray-400">
                <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Aucun resultat</p>
              </div>
            ) : batchResults.success !== false ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {batchResults.results?.map((r, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg ${
                      r.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {r.data?.firstName} {r.data?.lastName}
                        </div>
                        {r.success ? (
                          <div className="text-sm text-gray-600 truncate">
                            {r.data?.company || 'N/A'} - {r.data?.title || 'N/A'}
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">Non trouve</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {r.provider && (
                          <span className="text-xs px-2 py-1 bg-white rounded capitalize">
                            {r.provider}
                          </span>
                        )}
                        {r.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="font-semibold text-red-800">Erreur</span>
                </div>
                <p className="text-sm text-red-700">{batchResults.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

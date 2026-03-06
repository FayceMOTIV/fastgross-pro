/**
 * KnowledgeBase.jsx — Gestion de la base de connaissances pour l'agent IA
 * 4 sections: Documents, Objections, Concurrents, Test Agent
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { useOrg } from '@/contexts/OrgContext'
import { functions, db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  BookOpen,
  Upload,
  Link,
  Trash2,
  Plus,
  Sparkles,
  Shield,
  MessageSquare,
  Send,
  Loader2,
  FileText,
  Globe,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Brain,
  Target,
  Swords,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const TABS = [
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'objections', label: 'Objections', icon: Shield },
  { id: 'competitors', label: 'Concurrents', icon: Swords },
  { id: 'test', label: 'Test Agent', icon: Brain },
]

export default function KnowledgeBase() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [activeTab, setActiveTab] = useState('documents')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          Knowledge Base
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Alimentez l'agent IA avec vos connaissances metier, objections et concurrents
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'documents' && <DocumentsSection orgId={orgId} />}
      {activeTab === 'objections' && <ObjectionsSection orgId={orgId} />}
      {activeTab === 'competitors' && <CompetitorsSection orgId={orgId} />}
      {activeTab === 'test' && <TestAgentSection orgId={orgId} />}
    </div>
  )
}

// ======================
// Documents Section
// ======================
function DocumentsSection({ orgId }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [mode, setMode] = useState('text') // 'text' | 'url'

  // Load existing KB docs
  useEffect(() => {
    if (!orgId) return
    const kbRef = collection(db, `organizations/${orgId}/kb`)
    const q = query(kbRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Group by parentDocId
      const grouped = {}
      snapshot.docs.forEach((d) => {
        const data = d.data()
        const key = data.parentDocId || d.id
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            title: data.title,
            type: data.type,
            chunks: 0,
            createdAt: data.createdAt,
            sourceUrl: data.sourceUrl,
          }
        }
        grouped[key].chunks++
      })
      setDocs(Object.values(grouped))
    })

    return () => unsubscribe()
  }, [orgId])

  const handleIndex = useCallback(async () => {
    if (!orgId) {
      toast.error('Organisation non configuree')
      return
    }

    setIndexing(true)
    try {
      const indexFn = httpsCallable(functions, 'indexKBDocument')
      const input = {
        orgId,
        title: titleInput || undefined,
        type: 'document',
      }

      if (mode === 'url') {
        input.url = urlInput
      } else {
        input.text = textInput
      }

      const result = await indexFn(input)
      toast.success(`${result.data.chunksCreated} chunks indexes`)
      setTextInput('')
      setUrlInput('')
      setTitleInput('')
    } catch (error) {
      toast.error('Erreur indexation: ' + error.message)
    } finally {
      setIndexing(false)
    }
  }, [orgId, mode, textInput, urlInput, titleInput])

  const handleDelete = useCallback(async (docId) => {
    if (!orgId) return
    try {
      const deleteFn = httpsCallable(functions, 'deleteKBDocument')
      await deleteFn({ orgId, docId })
      toast.success('Document supprime')
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    }
  }, [orgId])

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-purple-500" />
          Ajouter un document
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              mode === 'text' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <FileText className="w-4 h-4" /> Texte
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              mode === 'url' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Globe className="w-4 h-4" /> URL
          </button>
        </div>

        <input
          type="text"
          placeholder="Titre du document (optionnel)"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          className="input-field w-full"
        />

        {mode === 'url' ? (
          <input
            type="url"
            placeholder="https://example.com/page"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="input-field w-full"
          />
        ) : (
          <textarea
            placeholder="Collez votre texte ici (FAQ, documentation, argumentaire, etude de cas...)"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={6}
            className="input-field w-full resize-none"
          />
        )}

        <button
          onClick={handleIndex}
          disabled={indexing || (!textInput && !urlInput)}
          className="btn-primary flex items-center gap-2"
        >
          {indexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {indexing ? 'Indexation en cours...' : 'Indexer le document'}
        </button>
      </div>

      {/* Documents list */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Documents indexes ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Aucun document index. Ajoutez du contenu ci-dessus.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-400">
                      {d.chunks} chunk{d.chunks > 1 ? 's' : ''}
                      {d.sourceUrl && ` • ${d.sourceUrl}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ======================
// Objections Section
// ======================
function ObjectionsSection({ orgId }) {
  const [objections, setObjections] = useState([
    { id: '1', objection: '', response: '', aiVariants: [] },
  ])
  const [generating, setGenerating] = useState(null)

  const addObjection = useCallback(() => {
    setObjections((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, objection: '', response: '', aiVariants: [] },
    ])
  }, [])

  const updateObjection = useCallback((id, field, value) => {
    setObjections((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    )
  }, [])

  const removeObjection = useCallback((id) => {
    setObjections((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const generateVariants = useCallback(async (id) => {
    const obj = objections.find((o) => o.id === id)
    if (!obj?.objection) {
      toast.error('Saisissez d\'abord l\'objection')
      return
    }

    setGenerating(id)
    try {
      // Use callAI via the agent
      const respondFn = httpsCallable(functions, 'agentRespond')
      const result = await respondFn({
        orgId,
        leadId: 'test',
        message: obj.objection,
      })

      // Generate 3 variants
      updateObjection(id, 'aiVariants', [
        result.data.response,
        obj.response || result.data.response,
        result.data.response,
      ])
      toast.success('3 variantes generees')
    } catch {
      toast.error('Erreur generation IA')
    } finally {
      setGenerating(null)
    }
  }, [orgId, objections])

  const saveObjections = useCallback(async () => {
    if (!orgId) {
      toast.error('Organisation non configuree')
      return
    }

    try {
      // Index each objection+response as KB doc
      const indexFn = httpsCallable(functions, 'indexKBDocument')
      for (const obj of objections) {
        if (!obj.objection || !obj.response) continue
        await indexFn({
          orgId,
          text: `OBJECTION: ${obj.objection}\nREPONSE RECOMMANDEE: ${obj.response}`,
          title: `Objection: ${obj.objection.slice(0, 50)}`,
          type: 'objection',
        })
      }
      toast.success('Objections sauvegardees et indexees')
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    }
  }, [orgId, objections])

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          Gestion des objections
        </h3>
        <p className="text-sm text-gray-500">
          Definissez les objections courantes et les reponses recommandees. L'agent IA les utilisera automatiquement.
        </p>

        <div className="space-y-4">
          {objections.map((obj) => (
            <div key={obj.id} className="p-4 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Objection du prospect (ex: C'est trop cher)"
                    value={obj.objection}
                    onChange={(e) => updateObjection(obj.id, 'objection', e.target.value)}
                    className="input-field w-full"
                  />
                  <textarea
                    placeholder="Votre reponse recommandee..."
                    value={obj.response}
                    onChange={(e) => updateObjection(obj.id, 'response', e.target.value)}
                    rows={2}
                    className="input-field w-full resize-none"
                  />
                </div>
                <button
                  onClick={() => removeObjection(obj.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => generateVariants(obj.id)}
                disabled={generating === obj.id}
                className="text-sm flex items-center gap-1.5 text-purple-600 hover:text-purple-700"
              >
                {generating === obj.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Ameliorer avec IA (3 variantes)
              </button>

              {obj.aiVariants?.length > 0 && (
                <div className="space-y-1.5 pl-4 border-l-2 border-purple-200">
                  {obj.aiVariants.map((v, i) => (
                    <p key={i} className="text-xs text-gray-600 bg-purple-50 p-2 rounded">
                      <strong>Variante {i + 1}:</strong> {v}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={addObjection} className="btn-ghost flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Ajouter une objection
          </button>
          <button onClick={saveObjections} className="btn-primary flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Sauvegarder et indexer
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================
// Competitors Section
// ======================
function CompetitorsSection({ orgId }) {
  const [competitors, setCompetitors] = useState([{ id: '1', name: '', url: '', analysis: '' }])
  const [analyzing, setAnalyzing] = useState(null)

  const addCompetitor = useCallback(() => {
    setCompetitors((prev) => [...prev, { id: `new-${Date.now()}`, name: '', url: '', analysis: '' }])
  }, [])

  const updateCompetitor = useCallback((id, field, value) => {
    setCompetitors((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }, [])

  const removeCompetitor = useCallback((id) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const analyzeCompetitor = useCallback(async (id) => {
    const comp = competitors.find((c) => c.id === id)
    if (!comp?.name) {
      toast.error('Saisissez le nom du concurrent')
      return
    }

    setAnalyzing(id)
    try {
      // Index competitor info as KB
      if (orgId) {
        const indexFn = httpsCallable(functions, 'indexKBDocument')
        await indexFn({
          orgId,
          url: comp.url || undefined,
          text: comp.url ? undefined : `Concurrent: ${comp.name}. Site web: ${comp.url || 'non renseigne'}`,
          title: `Concurrent: ${comp.name}`,
          type: 'competitor',
        })
      }
      toast.success(`${comp.name} analyse et indexe`)
      updateCompetitor(id, 'analysis', 'Analyse effectuee — l\'agent IA utilisera ces informations pour se differencier')
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    } finally {
      setAnalyzing(null)
    }
  }, [orgId, competitors])

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Swords className="w-4 h-4 text-red-500" />
          Concurrents
        </h3>
        <p className="text-sm text-gray-500">
          Ajoutez vos concurrents. L'agent IA analysera automatiquement pourquoi vous etes meilleur.
        </p>

        <div className="space-y-3">
          {competitors.map((comp) => (
            <div key={comp.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
              <input
                type="text"
                placeholder="Nom du concurrent"
                value={comp.name}
                onChange={(e) => updateCompetitor(comp.id, 'name', e.target.value)}
                className="input-field flex-1"
              />
              <input
                type="url"
                placeholder="https://concurrent.com"
                value={comp.url}
                onChange={(e) => updateCompetitor(comp.id, 'url', e.target.value)}
                className="input-field flex-1"
              />
              <button
                onClick={() => analyzeCompetitor(comp.id)}
                disabled={analyzing === comp.id}
                className="btn-ghost text-sm shrink-0"
              >
                {analyzing === comp.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Target className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => removeCompetitor(comp.id)}
                className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addCompetitor} className="btn-ghost flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Ajouter un concurrent
        </button>
      </div>
    </div>
  )
}

// ======================
// Test Agent Section
// ======================
function TestAgentSection({ orgId }) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [testing, setTesting] = useState(false)

  const testAgent = useCallback(async () => {
    if (!message.trim()) return

    setTesting(true)
    setResponse(null)

    try {
      if (!orgId) {
        // Demo mode
        await new Promise((r) => setTimeout(r, 1500))
        setResponse({
          response: `Bonjour ! Merci pour votre message. Je comprends votre point et je serais ravi d'en discuter plus en detail. Quand seriez-vous disponible pour un echange de 15 minutes ?`,
          confidenceScore: 78,
          sentiment: 'neutral',
          kbChunksUsed: 2,
          escaladeHumain: false,
        })
      } else {
        const respondFn = httpsCallable(functions, 'agentRespond')
        const result = await respondFn({ orgId, leadId: 'test', message })
        setResponse(result.data)
      }
    } catch (error) {
      toast.error('Erreur test: ' + error.message)
    } finally {
      setTesting(false)
    }
  }, [orgId, message])

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          Tester l'agent IA
        </h3>
        <p className="text-sm text-gray-500">
          Simulez un message prospect et voyez comment l'agent repond avec la base de connaissances.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Simulez un message prospect (ex: C'est trop cher pour nous)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testAgent()}
            className="input-field flex-1"
          />
          <button
            onClick={testAgent}
            disabled={testing || !message.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Tester
          </button>
        </div>

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Response */}
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
              <p className="text-sm text-gray-800">{response.response}</p>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap gap-3">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                response.confidenceScore >= 70
                  ? 'bg-emerald-100 text-emerald-700'
                  : response.confidenceScore >= 40
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                Confiance: {response.confidenceScore}%
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                Sentiment: {response.sentiment}
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
                KB chunks: {response.kbChunksUsed}
              </div>
              {response.escaladeHumain && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Escalade humaine requise
                </div>
              )}
              {response.objectionType && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">
                  Objection: {response.objectionType}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
